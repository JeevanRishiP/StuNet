/**
 * apps/admin/src/lib/db.ts
 *
 * Admin Prisma client — uses admin_service_role connection.
 * This role has SELECT on user_identity and most public tables,
 * but ZERO access to user_private_details, auth_sessions, auth_credentials.
 * Enforced at DB level via apply-security-boundaries.ts.
 *
 * NEVER use this client to read user_private_details.
 * NEVER add PII fields to queries using this client without asking the user first.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __adminPrisma: PrismaClient | undefined;
}

function createAdminClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env["DATABASE_URL"],
      },
    },
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });
}

// Singleton in dev to avoid exhausting connection pool
export const adminDb: PrismaClient = globalThis.__adminPrisma ?? createAdminClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__adminPrisma = adminDb;
}
