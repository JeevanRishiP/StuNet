/**
 * successBoard.ts — BullMQ worker for the success-board-refresh queue.
 *
 * Job: Refresh the `success_board_rankings` materialized view.
 * Triggered by: Brave metric submissions, achievement verifications.
 *
 * Security: uses app_service_role — read/write to allowed tables only.
 * No PII is logged — only job IDs and timing metrics.
 */
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { createRedisConnection } from "../connection.js";

export const SUCCESS_BOARD_QUEUE = "success-board-refresh";

/** Shape of data stored in the queue job */
export interface SuccessBoardJobData {
  campusId?: string; // if present, only refresh for this campus
  triggeredBy?: string; // user ID that triggered refresh (no PII — ID only)
}

export function createSuccessBoardQueue() {
  return new Queue<SuccessBoardJobData>(SUCCESS_BOARD_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 100 },
    },
  });
}

export function startSuccessBoardWorker(
  db: PrismaClient,
  logger: Logger,
): Worker<SuccessBoardJobData> {
  const worker = new Worker<SuccessBoardJobData>(
    SUCCESS_BOARD_QUEUE,
    async (job) => {
      const start = Date.now();
      logger.info(
        { jobId: job.id, campusId: job.data.campusId },
        "success-board-refresh: starting",
      );

      // Refresh the materialized view via raw SQL.
      // This is safe: no user input is interpolated — only a fixed SQL command.
      await db.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW CONCURRENTLY success_board_rankings`);

      const elapsed = Date.now() - start;
      logger.info({ jobId: job.id, elapsedMs: elapsed }, "success-board-refresh: done");
    },
    {
      connection: createRedisConnection(),
      concurrency: 1, // serialise refreshes to avoid lock contention
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "success-board-refresh: job failed");
  });

  return worker;
}
