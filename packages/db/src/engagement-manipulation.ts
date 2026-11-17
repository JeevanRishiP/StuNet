/**
 * packages/db/src/engagement-manipulation.ts
 *
 * Engagement-Manipulation Detection logic.
 *
 * Algorithm:
 * For each user with likes in the trailing 30 days, computes what share of their likes
 * went to their single most-liked author.
 * Flags any user exceeding an 80% share (0.80 concentration ratio).
 *
 * Security & Moderation:
 * - Flags are stored strictly in `engagement_anomaly_flags` for human moderation review.
 * - This detection NEVER auto-acts (no automated post/like deletions, no automated account suspensions).
 */

import { PrismaClient, AnomalyStatus } from "@prisma/client";

export interface AnomalyDetectionSummary {
  scannedUsersCount: number;
  flaggedUsersCount: number;
  flags: Array<{
    userId: string;
    concentrationRatio: number;
    totalLikes: number;
    maxAuthorLikes: number;
  }>;
}

export async function detectEngagementManipulation(
  db: PrismaClient,
  options: {
    windowDays?: number;
    threshold?: number;
    minLikes?: number;
  } = {},
): Promise<AnomalyDetectionSummary> {
  const windowDays = options.windowDays ?? 30;
  const threshold = options.threshold ?? 0.8; // 80% share
  const minLikes = options.minLikes ?? 3; // Minimum likes to avoid 1-like noise

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Raw SQL aggregation for high efficiency across millions of likes
  const rows = await db.$queryRaw<
    Array<{
      user_id: string;
      total_likes: number;
      max_author_likes: number;
      concentration_ratio: number;
    }>
  >`
    WITH user_author_likes AS (
      SELECT
        pl.user_id,
        p.author_id,
        COUNT(*)::int AS author_like_count
      FROM post_likes pl
      JOIN posts p ON pl.post_id = p.id
      WHERE pl.created_at >= ${windowStart}
        AND pl.created_at <= ${windowEnd}
        AND p.author_id IS NOT NULL
      GROUP BY pl.user_id, p.author_id
    ),
    user_aggregates AS (
      SELECT
        user_id,
        SUM(author_like_count)::int AS total_likes,
        MAX(author_like_count)::int AS max_author_likes
      FROM user_author_likes
      GROUP BY user_id
    )
    SELECT
      user_id,
      total_likes,
      max_author_likes,
      ROUND((max_author_likes::numeric / total_likes::numeric), 4)::float AS concentration_ratio
    FROM user_aggregates
    WHERE total_likes >= ${minLikes};
  `;

  const scannedUsersCount = rows.length;
  const flagged = rows.filter((r) => r.concentration_ratio > threshold);

  // Store flags into engagement_anomaly_flags for human review
  for (const item of flagged) {
    await db.engagementAnomalyFlag.create({
      data: {
        userId: item.user_id,
        concentrationRatio: item.concentration_ratio,
        windowStart,
        windowEnd,
        flaggedAt: new Date(),
        status: "FLAGGED" as AnomalyStatus,
      },
    });
  }

  return {
    scannedUsersCount,
    flaggedUsersCount: flagged.length,
    flags: flagged.map((f) => ({
      userId: f.user_id,
      concentrationRatio: f.concentration_ratio,
      totalLikes: f.total_likes,
      maxAuthorLikes: f.max_author_likes,
    })),
  };
}
