/**
 * apps/admin/src/lib/enrollmentDb.ts
 *
 * Dedicated client connected with AUTH_DATABASE_URL (app_service_role).
 * Used exclusively for Campus Managers to enroll and manage student Google account identities
 * and private details (whitelisted emails) under their campus scope.
 */
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __enrollmentPrisma: PrismaClient | undefined;
}

function createEnrollmentClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: { url: process.env["AUTH_DATABASE_URL"] ?? process.env["DATABASE_URL"] },
    },
    log: process.env["NODE_ENV"] === "development" ? ["warn", "error"] : ["error"],
  });
}

export const enrollmentDb: PrismaClient = globalThis.__enrollmentPrisma ?? createEnrollmentClient();

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__enrollmentPrisma = enrollmentDb;
}
