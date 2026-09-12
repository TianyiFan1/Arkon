import { afterAll } from 'vitest';
import prisma from '../src/lib/prisma';

// Refuse direct Vitest runs against developer/production data.
const name = process.env.ARKON_TEST_DATABASE;
if (!name || !/^arkon_test_[a-f0-9]{32}$/.test(name) || new URL(process.env.DATABASE_URL!).pathname !== `/${name}`) {
  throw new Error('Use npm test: it provisions an isolated PostgreSQL database.');
}
afterAll(async () => { await prisma.$disconnect(); });
