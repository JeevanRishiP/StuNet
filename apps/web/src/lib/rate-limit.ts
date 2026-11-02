/**
 * apps/web/src/lib/rate-limit.ts
 * Redis-backed rate limiting utility.
 * Used on every write endpoint per plan Section 4.
 */
import { Redis } from "ioredis";

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * rateLimit — sliding window counter.
 * @param key      unique key (e.g. `post:${userId}`)
 * @param limit    max requests allowed
 * @param windowMs window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const count = await redis.incr(`rl:${key}`);
  if (count === 1) await redis.expire(`rl:${key}`, windowSeconds);
  const ttl = await redis.ttl(`rl:${key}`);
  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds: ttl,
  };
}

/** Rate limits per plan Section 4 */
export const LIMITS = {
  POST_CREATE: { limit: 10, windowMs: 60_000 }, // 10 posts/min
  CONNECTION_REQUEST: { limit: 20, windowMs: 60 * 60_000 }, // 20/hr
  REPORT_SUBMIT: { limit: 5, windowMs: 60 * 60_000 }, // 5/hr
  POLL_VOTE: { limit: 50, windowMs: 60_000 },
  MARKET_LISTING: { limit: 5, windowMs: 24 * 60 * 60_000 }, // 5/day
} as const;
