/**
 * mlTrainer.ts — BullMQ queue & scheduled worker that triggers the offline ML training script.
 *
 * Runs `apps/ml-trainer/train.py` on a weekly schedule (or on-demand).
 * Logs offline training progress without user-facing disruption (shadow mode).
 */
import { Worker, Queue } from "bullmq";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { promisify } from "node:util";
import type { Logger } from "pino";
import { createRedisConnection } from "../connection.js";

const execFileAsync = promisify(execFile);

export const ML_TRAINER_QUEUE = "ml-trainer";

export interface MLTrainerJobData {
  shadowMode?: boolean;
  minExamples?: number;
  allowSynthetic?: boolean;
}

export function resolvePythonPath(projectRoot: string): string {
  const venvPython = join(projectRoot, "apps", "ml-trainer", ".venv", "bin", "python");
  if (existsSync(venvPython)) {
    return venvPython;
  }
  return "python3";
}

export function createMLTrainerQueue() {
  return new Queue<MLTrainerJobData>(ML_TRAINER_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 30000 },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 20 },
    },
  });
}

export function startMLTrainerWorker(logger: Logger): Worker<MLTrainerJobData> {
  const projectRoot = resolve(process.cwd(), "..", "..");
  const scriptPath = join(projectRoot, "apps", "ml-trainer", "train.py");

  const worker = new Worker<MLTrainerJobData>(
    ML_TRAINER_QUEUE,
    async (job) => {
      logger.info({ jobId: job.id }, "ml-trainer: starting scheduled offline training job");
      const pythonBin = resolvePythonPath(projectRoot);

      const args = [scriptPath];
      // Default to shadow mode unless explicitly overridden
      if (job.data.shadowMode !== false) {
        args.push("--shadow");
      }
      if (job.data.minExamples) {
        args.push("--min-examples", String(job.data.minExamples));
      }
      if (job.data.allowSynthetic) {
        args.push("--allow-synthetic");
      }

      logger.info(
        { jobId: job.id, pythonBin, scriptPath, args },
        "ml-trainer: executing training script",
      );

      try {
        const { stdout, stderr } = await execFileAsync(pythonBin, args, {
          cwd: join(projectRoot, "apps", "ml-trainer"),
          env: { ...process.env },
          timeout: 10 * 60 * 1000, // 10 minute timeout
        });

        if (stderr) {
          logger.warn({ jobId: job.id, stderr }, "ml-trainer: script stderr output");
        }

        logger.info(
          { jobId: job.id, outputSample: stdout.slice(-300) },
          "ml-trainer: training script finished successfully",
        );
      } catch (err: unknown) {
        const error = err as Error;
        logger.error(
          { jobId: job.id, error: error.message },
          "ml-trainer: training execution failed",
        );
        throw error;
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "ml-trainer: job failed");
  });

  return worker;
}
