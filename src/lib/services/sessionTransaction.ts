import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { AppError } from '../errors';

// All session reads/writes take the same row lock. A reader cannot combine
// answers from one committed revision with an assessment from another.
export function withSession<T>(id: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "UserSession" WHERE "id" = ${id} FOR UPDATE
    `;
    if (!rows.length) throw new AppError('SESSION_NOT_FOUND', 'Session does not exist', 404);
    return operation(tx);
  }, { maxWait: 10000, timeout: 15000 });
}

export function assertVersion(actual: number, expected?: number) {
  if (expected !== undefined && expected !== actual) {
    throw new AppError('VERSION_CONFLICT', 'Answers changed. Reload the saved progress before retrying.', 409, { version: actual });
  }
}
