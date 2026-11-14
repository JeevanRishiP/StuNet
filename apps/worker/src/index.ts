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
// Load local environment files if present
for (const envPath of [".env.local", ".env", "../../.env"]) {
  try {
    process.loadEnvFile?.(envPath);
  } catch {
    // Ignore missing files
  }
}

import pino from "pino";
import { PrismaClient } from "@prisma/client";
import { startSuccessBoardWorker } from "./queues/successBoard.js";
import { startNotificationWorker } from "./queues/notifications.js";
import {
  startReportEscalationWorker,
  createReportEscalationQueue,
  REPORT_ESCALATION_QUEUE,
} from "./queues/reportEscalation.js";
import {
  startFeedRankingStatsWorker,
  createFeedRankingStatsQueue,
  FEED_RANKING_STATS_QUEUE,
} from "./queues/feedRankingStats.js";
import {
  startMLTrainerWorker,
  createMLTrainerQueue,
  ML_TRAINER_QUEUE,
} from "./queues/mlTrainer.js";

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
const feedRankingStatsWorker = startFeedRankingStatsWorker(db, logger);
const mlTrainerWorker = startMLTrainerWorker(logger);

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

// ── Cron: schedule feed-ranking-stats refresh every 24 hours (daily) ─────────
const feedRankingStatsQueue = createFeedRankingStatsQueue();

async function scheduleFeedRankingStatsCron() {
  // Refreshes author_engagement_stats and user_author_affinity from recent posts/likes/comments
  await feedRankingStatsQueue.upsertJobScheduler(
    "feed-ranking-stats-daily",
    { every: 24 * 60 * 60 * 1000 }, // 24 hours in ms
    {
      name: FEED_RANKING_STATS_QUEUE,
      data: {},
      opts: { attempts: 3 },
    },
  );
  logger.info("feed-ranking-stats daily cron scheduled (every 24 hours)");
}

scheduleFeedRankingStatsCron().catch((err: Error) => {
  logger.error({ err: err.message }, "Failed to schedule feed-ranking-stats cron");
});

// ── Cron: schedule ml-trainer offline training every 7 days (weekly) ─────────
const mlTrainerQueue = createMLTrainerQueue();

async function scheduleMLTrainerCron() {
  // Shells out to apps/ml-trainer/train.py in shadow mode
  await mlTrainerQueue.upsertJobScheduler(
    "ml-trainer-weekly",
    { every: 7 * 24 * 60 * 60 * 1000 }, // 7 days in ms
    {
      name: ML_TRAINER_QUEUE,
      data: { shadowMode: true },
      opts: { attempts: 2 },
    },
  );
  logger.info("ml-trainer weekly cron scheduled (every 7 days)");
}

scheduleMLTrainerCron().catch((err: Error) => {
  logger.error({ err: err.message }, "Failed to schedule ml-trainer cron");
});

logger.info(
  {
    queues: [
      "success-board-refresh",
      "notification-dispatch",
      "report-escalation",
      "feed-ranking-stats",
      "ml-trainer",
    ],
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
    feedRankingStatsWorker.close(),
    feedRankingStatsQueue.close(),
    mlTrainerWorker.close(),
    mlTrainerQueue.close(),
    db.$disconnect(),
  ]);

  logger.info("All workers drained — exiting");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
