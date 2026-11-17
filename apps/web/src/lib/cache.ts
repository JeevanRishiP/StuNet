/**
 * apps/web/src/lib/cache.ts
 *
 * High-performance Redis caching utility for read-heavy hot paths:
 * - Public feed candidate sets
 * - Success Board leaderboards
 * - Directory and autocomplete search queries
 */
import { Redis } from "ioredis";
import type { NextRequest } from "next/server";

export const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6382", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (err) {
    console.error(`[Cache] Error reading key ${key}:`, err);
    return null;
  }
}

export async function setCachedJson(key: string, data: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    console.error(`[Cache] Error writing key ${key}:`, err);
  }
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
