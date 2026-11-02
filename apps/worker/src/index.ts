/**
 * index.ts — StuNet BullMQ Worker entrypoint.
 *
 * Starts three workers:
 *  1. success-board-refresh   — refreshes materialized success board rankings
 *  2. notification-dispatch   — fan-out in-app notifications
 *  3. report-escalation       — auto-escalate stale open reports (cron)
 *
 * Security:
 *  - DATABASE_URL must use app_service_role (NOT owner / admin_service_role)
 *  - No PII is logged — only IDs and timing metrics
 *  - Redis connection uses maxRetriesPerRequest: null (BullMQ requirement)
 */
import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { startSuccessBoardWorker } from "./queues/successBoard.js";
import { startNotificationWorker } from "./queues/notifications.js";
import {
  startReportEscalationWorker,
  createReportEscalationQueue,
  REPORT_ESCALATION_QUEUE,
} from "./queues/reportEscalation.js";

// ── Logger ──────────────────────────────────────────────────────────────────
const logger = pino({
  name: "stunet-worker",
  level: process.env["LOG_LEVEL"] ?? "info",
});

// ── Database ─────────────────────────────────────────────────────────────────
const db = new PrismaClient({
  log: [
    { level: "warn", emit: "event" },
    { level: "error", emit: "event" },
  ],
});

// Log Prisma events without exposing query content (no PII)
db.$on("warn", (e) => logger.warn({ source: "prisma" }, e.message));
db.$on("error", (e) => logger.error({ source: "prisma" }, e.message));

// ── Workers ───────────────────────────────────────────────────────────────────
logger.info("StuNet worker starting — registering queues");

const successBoardWorker = startSuccessBoardWorker(db, logger);
const notificationWorker = startNotificationWorker(db, logger);
const reportEscalationWorker = startReportEscalationWorker(db, logger);

// ── Cron: schedule report-escalation every 4 hours ───────────────────────────
const reportEscalationQueue = createReportEscalationQueue();

async function scheduleReportEscalationCron() {
  // BullMQ repeat jobs use cron syntax.
  // Every 4 hours: check for stale OPEN reports and bump to UNDER_REVIEW.
  await reportEscalationQueue.upsertJobScheduler(
    "report-escalation-cron",
    { every: 4 * 60 * 60 * 1000 }, // 4 hours in ms
    {
      name: REPORT_ESCALATION_QUEUE,
      data: {},
      opts: { attempts: 3 },
    },
  );
  logger.info("report-escalation cron scheduled (every 4 hours)");
}

scheduleReportEscalationCron().catch((err: Error) => {
  logger.error({ err: err.message }, "Failed to schedule report-escalation cron");
});

logger.info(
  {
    queues: ["success-board-refresh", "notification-dispatch", "report-escalation"],
  },
  "All workers registered",
);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received — draining workers");

  await Promise.allSettled([
    successBoardWorker.close(),
    notificationWorker.close(),
    reportEscalationWorker.close(),
    reportEscalationQueue.close(),
    db.$disconnect(),
  ]);

  logger.info("All workers drained — exiting");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
