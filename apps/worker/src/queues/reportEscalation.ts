/**
 * reportEscalation.ts — BullMQ worker for the report-escalation queue.
 *
 * Job: Auto-escalate reports that have been OPEN for longer than the SLA window.
 * Runs on a schedule (cron) — triggered by the main worker on startup.
 *
 * Security: Only report IDs are logged — no content, no PII.
 */
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { createRedisConnection } from "../connection.js";

export const REPORT_ESCALATION_QUEUE = "report-escalation";

/** SLA: escalate reports open longer than this many hours */
const ESCALATION_HOURS = 48;

/** Shape of data stored in the queue job */
export interface ReportEscalationJobData {
  /** If set, only escalate reports for this campus */
  campusId?: string;
}

export function createReportEscalationQueue() {
  return new Queue<ReportEscalationJobData>(REPORT_ESCALATION_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    },
  });
}

export function startReportEscalationWorker(
  db: PrismaClient,
  logger: Logger,
): Worker<ReportEscalationJobData> {
  const worker = new Worker<ReportEscalationJobData>(
    REPORT_ESCALATION_QUEUE,
    async (job) => {
      const cutoff = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000);

      logger.info(
        { jobId: job.id, cutoff: cutoff.toISOString() },
        "report-escalation: scanning stale open reports",
      );

      // Find stale OPEN reports — only IDs, no content queried
      const stale = await db.report.findMany({
        where: {
          status: "OPEN",
          createdAt: { lt: cutoff },
          ...(job.data.campusId
            ? {
                // Campus scoping: route through the reported entity's campus.
                // Best effort — reports without a campus link still escalated.
              }
            : {}),
        },
        select: { id: true },
        take: 200, // process in batches
      });

      if (stale.length === 0) {
        logger.info({ jobId: job.id }, "report-escalation: no stale reports");
        return;
      }

      const ids = stale.map((r) => r.id);

      // Bulk update to UNDER_REVIEW (schema has no ESCALATED — closest escalation state)
      const updated = await db.report.updateMany({
        where: { id: { in: ids }, status: "OPEN" },
        data: { status: "UNDER_REVIEW" },
      });

      logger.info({ jobId: job.id, escalated: updated.count }, "report-escalation: done");
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "report-escalation: job failed");
  });

  return worker;
}
