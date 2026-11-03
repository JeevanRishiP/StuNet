/**
 * connection.ts — shared IORedis connection for BullMQ.
 *
 * BullMQ requires a dedicated connection (not shared across workers/queues).
 * Each queue/worker gets its own connection instance derived from these options.
 */
import { Redis } from "ioredis";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6382";

/**
 * Create a new IORedis connection for BullMQ.
 * Call once per Worker/Queue instance — do NOT share connections.
 */
export function createRedisConnection(): Redis {
  const conn = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
  });

  conn.on("error", (err: Error) => {
    // Log without PII — Redis errors contain no user data
    process.stderr.write(`[redis] connection error: ${err.message}\n`);
  });

  return conn;
}
