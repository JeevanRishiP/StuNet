/**
 * apps/web/src/lib/db.ts
 * Singleton Prisma client for apps/web (app_service_role).
 * Structured logging via pino — never logs PII, only user IDs.
 */
import { PrismaClient } from "@prisma/client";
import pino from "pino";

const logger = pino({ name: "stunet-web-db", level: process.env["LOG_LEVEL"] ?? "info" });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
          ]
        : [{ emit: "stdout", level: "error" }],
  });

if (process.env["NODE_ENV"] !== "production") globalForPrisma.prisma = db;

// Log queries in dev without exposing params (params may contain sensitive data)
if (process.env["NODE_ENV"] === "development") {
  (
    db as PrismaClient & { $on: (event: string, cb: (e: { duration: number }) => void) => void }
  ).$on("query", (e) => {
    logger.debug({ duration: e.duration }, "DB query");
  });
}
