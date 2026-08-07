/**
 * lib/db.ts — Prisma Client Singleton
 *
 * In development, Next.js hot-reloads modules which would create a new
 * PrismaClient instance on every reload and exhaust the DB connection pool.
 * This module prevents that by storing the client on the global object.
 *
 * Usage (in any server-side file):
 *   import { db } from '@/lib/db';
 *   const users = await db.user.findMany();
 *
 * TODO:
 * - Optionally pass PrismaClient constructor options (e.g. logging levels):
 *     new PrismaClient({ log: ['query', 'warn', 'error'] })
 * - Add connection error handling / retry logic if needed.
 */

import { PrismaClient } from '@prisma/client';

// Extend the global type to store the PrismaClient instance.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// TODO: Uncomment and configure options as needed:
// const prismaClientOptions: ConstructorParameters<typeof PrismaClient>[0] = {
//   log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
// };

export const db: PrismaClient =
  // In production always create a new instance; in development reuse the global.
  globalThis.prisma ?? new PrismaClient(/* prismaClientOptions */);

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}
