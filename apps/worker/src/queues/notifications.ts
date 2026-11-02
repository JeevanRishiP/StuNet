/**
 * notifications.ts — BullMQ worker for the notification-dispatch queue.
 *
 * Job: Fan-out an in-app notification to one or more recipients.
 * Triggered by: connection requests, club joins, achievement verifications, etc.
 *
 * Security:
 *  - Only user IDs flow through job data — no PII (name, email) stored in Redis.
 *  - `type` must be a valid NotificationType enum value.
 *  - Max fan-out capped at FANOUT_LIMIT to prevent abuse.
 */
import { Worker, Queue } from "bullmq";
import { PrismaClient, NotificationType } from "@prisma/client";
import type { Logger } from "pino";
import { createRedisConnection } from "../connection.js";

export const NOTIFICATION_QUEUE = "notification-dispatch";

const FANOUT_LIMIT = 500; // max recipients per job

/** Shape of data stored in the queue job — NO PII */
export interface NotificationJobData {
  /** Must be a valid NotificationType enum key */
  type: NotificationType;
  /** Recipients by user ID */
  recipientIds: string[];
  /** Actor user ID — no name/email */
  triggeredById?: string;
  /** Human-readable notification title (no PII) */
  title: string;
  /** Optional body text */
  body?: string;
  /** Optional action URL */
  actionUrl?: string;
}

export function createNotificationQueue() {
  return new Queue<NotificationJobData>(NOTIFICATION_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    },
  });
}

export function startNotificationWorker(
  db: PrismaClient,
  logger: Logger,
): Worker<NotificationJobData> {
  const worker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE,
    async (job) => {
      const { type, recipientIds, triggeredById, title, body, actionUrl } = job.data;

      // Guard: cap fan-out
      const targets = recipientIds.slice(0, FANOUT_LIMIT);
      if (targets.length === 0) {
        logger.warn({ jobId: job.id, type }, "notification-dispatch: no recipients");
        return;
      }

      logger.info(
        { jobId: job.id, type, count: targets.length },
        "notification-dispatch: fanning out",
      );

      // Bulk-insert notifications. createMany skips duplicates via skipDuplicates.
      const result = await db.notification.createMany({
        data: targets.map((recipientId) => ({
          recipientId,
          triggeredById: triggeredById ?? null,
          type,
          title,
          body: body ?? null,
          actionUrl: actionUrl ?? null,
        })),
        skipDuplicates: true,
      });

      logger.info({ jobId: job.id, type, created: result.count }, "notification-dispatch: done");
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "notification-dispatch: job failed");
  });

  return worker;
}
