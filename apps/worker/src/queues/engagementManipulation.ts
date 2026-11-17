/**
 * apps/worker/src/queues/engagementManipulation.ts
 *
 * BullMQ Worker for Engagement-Manipulation Detection.
 *
 * Job:
 * For each user with likes in the trailing 30 days, compute what share of their likes
 * went to their single most-liked author.
 * Flag any user over an 80% share (0.80 concentration ratio).
 *
 * Security & Ethics:
 * - Flags are stored strictly in `engagement_anomaly_flags` for human moderation review only.
 * - This detection NEVER auto-acts (no automated post/like deletions, no automated account suspensions).
 */

import { Worker, Queue } from "bullmq";
import type { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { detectEngagementManipulation, type AnomalyDetectionSummary } from "@stunet/db";
import { createRedisConnection } from "../connection.js";

export const ENGAGEMENT_MANIPULATION_QUEUE = "engagement-manipulation";

export interface EngagementManipulationJobData {
  windowDays?: number;
  threshold?: number;
  minLikes?: number;
}

export { detectEngagementManipulation, type AnomalyDetectionSummary };

export function createEngagementManipulationQueue() {
  return new Queue<EngagementManipulationJobData>(ENGAGEMENT_MANIPULATION_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 15000 },
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    },
  });
}

export function startEngagementManipulationWorker(
  db: PrismaClient,
  logger: Logger,
): Worker<EngagementManipulationJobData> {
  const worker = new Worker<EngagementManipulationJobData>(
    ENGAGEMENT_MANIPULATION_QUEUE,
    async (job) => {
      logger.info(
        { jobId: job.id, windowDays: job.data.windowDays ?? 30 },
        "engagement-manipulation: running scheduled detection scan",
      );

      const result = await detectEngagementManipulation(db, job.data);

      logger.info(
        {
          jobId: job.id,
          scanned: result.scannedUsersCount,
          flagged: result.flaggedUsersCount,
        },
        "engagement-manipulation: scan complete",
      );

      return result;
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("error", (err) => {
    logger.error({ err }, "engagement-manipulation worker error");
  });

  return worker;
}
