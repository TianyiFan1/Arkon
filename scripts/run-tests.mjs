import { startPostgres } from './postgres.mjs';
import pg from 'pg';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// Desktop sandbox PATH may omit System32; Playwright needs taskkill for teardown.
if (process.platform === 'win32') process.env.PATH = `${path.join(process.env.SystemRoot || 'C:\\Windows', 'System32')};${process.env.PATH || ''}`;

const args = process.argv.slice(2);
const database = `arkon_test_${randomUUID().replaceAll('-', '')}`;
let embedded;
let admin;
let created = false;
let child;
const run = (entry, params, env) => new Promise((resolve, reject) => {
  child = spawn(process.execPath, [entry, ...params], { env, stdio: 'inherit', windowsHide: true });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Command failed (${code}): ${entry}`)));
});
try {
  let base = process.env.TEST_DATABASE_URL;
  if (!base) {
    const server = net.createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    await new Promise(resolve => server.close(resolve));
    const directory = await mkdtemp(path.join(tmpdir(), 'arkon-pg-test-'));
    if (!path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error('Unsafe test directory');
    const password = randomUUID();
    embedded = await startPostgres({ directory, port, password });
    base = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
  }
  const url = new URL(base);
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('TEST_DATABASE_URL must use PostgreSQL');
  admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  // Only ever create/drop our randomly named database; never reset the supplied DB.
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  url.pathname = `/${database}`;
  const env = { ...process.env, DATABASE_URL: url.toString(), DIRECT_URL: url.toString(), ARKON_TEST_DATABASE: database, NEXT_DIST_DIR: '.next-test' };
  await run('node_modules/prisma/build/index.js', ['generate'], env);
  await run('node_modules/prisma/build/index.js', ['migrate', 'deploy'], env);
  if (!args.includes('--browser')) {
    await run('node_modules/vitest/vitest.mjs', ['run', ...(args.includes('--coverage') ? ['--coverage'] : [])], env);
  }
  if (!args.includes('--unit')) {
    await run('node_modules/next/dist/bin/next', ['build'], env);
    await run('node_modules/@playwright/test/cli.js', ['test'], env);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (admin) {
    if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end();
  }
  if (embedded) await embedded.stop();
}
