import { cp, mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);

export async function startPostgres({ directory, port, password, persistent = false }) {
  const initialized = await access(path.join(directory, 'PG_VERSION')).then(() => true, () => false);
  if (process.platform !== 'win32') {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const server = new EmbeddedPostgres({ databaseDir: directory, port, user: 'postgres', password, persistent,
      initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: () => {} });
    if (!initialized) await server.initialise();
    await server.start();
    return server;
  }
  // PostgreSQL on Windows cannot bootstrap UTF8 catalogs from a non-ASCII
  // installation path. Copy only its native runtime to an ASCII temp path.
  const runtime = await mkdtemp(path.join(tmpdir(), 'arkon-pg-bin-'));
  const { initdb } = await import('@embedded-postgres/windows-x64');
  await cp(path.dirname(path.dirname(initdb)), runtime, { recursive: true });
  const passwordFile = path.join(runtime, 'password.txt');
  await writeFile(passwordFile, password);
  const options = { windowsHide: true, timeout: 60000, cwd: runtime };
  const ctl = path.join(runtime, 'bin', 'pg_ctl.exe');
  let started = false;
  const safeRemove = async target => {
    if (!path.resolve(target).startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error('Unsafe PostgreSQL cleanup path');
    await rm(target, { recursive: true, force: true });
  };
  try {
    if (!initialized) await exec(path.join(runtime, 'bin', 'initdb.exe'), ['-D', directory, '-U', 'postgres', '--pwfile', passwordFile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C'], options);
    await exec(ctl, ['-D', directory, '-l', path.join(directory, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], options);
    started = true;
  } catch (error) {
    await safeRemove(runtime);
    throw error;
  }
  return { async stop() {
    if (started) {
      await exec(ctl, ['-D', directory, '-m', 'fast', '-w', 'stop'], options);
      started = false;
    }
    await safeRemove(runtime);
    if (!persistent) await safeRemove(directory);
  } };
}
