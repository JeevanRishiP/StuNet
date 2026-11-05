/**
 * apps/dev/src/lib/db.ts
 * Full-privilege Prisma client for the Dev Portal.
 * Uses DATABASE_URL directly — no row-level restrictions.
 * DEV ONLY — middleware ensures this never runs in production.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __devPrisma: PrismaClient | undefined;
}

function createDevClient() {
  return new PrismaClient({
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
    log: ["warn", "error"],
  });
}

export const devDb: PrismaClient = globalThis.__devPrisma ?? createDevClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__devPrisma = devDb;
}
