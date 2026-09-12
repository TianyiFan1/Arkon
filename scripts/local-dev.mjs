import { startPostgres } from './postgres.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { spawn } from 'node:child_process';
if (process.platform === 'win32') process.env.PATH = `${path.join(process.env.SystemRoot || 'C:\\Windows', 'System32')};${process.env.PATH || ''}`;

const name = createHash('sha256').update(process.cwd()).digest('hex').slice(0, 12);
const directory = path.join(tmpdir(), `arkon-dev-${name}`);
const port = Number(process.env.LOCAL_PG_PORT || 55432);
const password = 'arkon-development-only';
const server = await startPostgres({ directory, port, password, persistent: true });
const url = `postgresql://postgres:${password}@127.0.0.1:${port}/arkon`;
const env = { ...process.env, DATABASE_URL: url };
let child;
const run = (entry, args = []) => new Promise((resolve, reject) => {
  child = spawn(process.execPath, [entry, ...args], { env, stdio: 'inherit', windowsHide: true });
  child.once('error', reject);
  child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Process exited with ${code}`)));
});
try {
  const admin = new pg.Client({ connectionString: url.replace('/arkon', '/postgres') });
  await admin.connect();
  try {
    if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname = 'arkon'")).rowCount) await admin.query('CREATE DATABASE arkon');
  } finally { await admin.end(); }
  await run('node_modules/prisma/build/index.js', ['generate']);
  await run('node_modules/prisma/build/index.js', ['migrate', 'deploy']);
  await run('node_modules/tsx/dist/cli.mjs', ['scripts/seed.ts']);
  console.log(`Local PostgreSQL data: ${directory}`);
  console.log('Open http://localhost:3000');
  await run('node_modules/next/dist/bin/next', ['dev', '--hostname', '127.0.0.1', '--port', '3000']);
} finally {
  await server.stop();
}
