/**
 * GET /api/dev/queues — inspect BullMQ queues
 * POST /api/dev/queues — add a job / retry failed
 */
import { NextRequest, NextResponse } from "next/server";
import { Queue, type ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6382", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

const redisConnection = connection as unknown as ConnectionOptions;

const QUEUE_NAMES = ["notifications", "reportEscalation", "successBoard"];

async function getQueueStats(name: string) {
  const q = new Queue(name, { connection: redisConnection });
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    q.getWaitingCount(),
    q.getActiveCount(),
    q.getCompletedCount(),
    q.getFailedCount(),
    q.getDelayedCount(),
  ]);
  const failedJobs = await q.getFailed(0, 4);
  await q.close();
  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    recentFailed: failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason,
      data: j.data,
      timestamp: j.timestamp,
    })),
  };
}

export async function GET(): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const stats = await Promise.all(QUEUE_NAMES.map(getQueueStats));
    return NextResponse.json({ queues: stats });
  } catch (err) {
    return NextResponse.json({ error: "Queue error", detail: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { queue: string; jobName: string; data: unknown };

  try {
    const q = new Queue(body.queue, { connection: redisConnection });
    const job = await q.add(body.jobName, body.data ?? {});
    await q.close();
    return NextResponse.json({ jobId: job.id });
  } catch (err) {
    return NextResponse.json({ error: "Queue add failed", detail: String(err) }, { status: 400 });
  }
}
