import 'server-only';

/**
 * Prisma client singleton.
 *
 * The content layer works in two modes (spec §81 portability):
 *  - DATABASE_URL configured → full persistence (CMS, analytics, auth records)
 *  - not configured → bundled seed content, and write-paths report an honest
 *    "not configured" state instead of silently dropping data.
 */

let prisma: import('@prisma/client').PrismaClient | null = null;

export function getPrisma(): import('@prisma/client').PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  if (!prisma) {
    // Lazy require so builds without DATABASE_URL never touch the engine
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}

export const dbReady = (): boolean => Boolean(process.env.DATABASE_URL);
