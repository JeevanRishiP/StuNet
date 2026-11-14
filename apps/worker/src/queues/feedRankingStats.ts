/**
 * feedRankingStats.ts — BullMQ worker & scheduled daily job for Feed Ranking System v2.
 *
 * Tasks:
 *  1. author_engagement_stats: calculates 30-day post count, avg likes, avg comments per author
 *  2. user_author_affinity: calculates normalized count of viewer's likes/comments on author's posts (last 30d)
 *
 * Security:
 *  - Only user IDs and aggregate counts are manipulated (no PII, no post content).
 *  - Runs under app_service_role.
 */
import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import type { Logger } from "pino";
import { createRedisConnection } from "../connection.js";

export const FEED_RANKING_STATS_QUEUE = "feed-ranking-stats";

export interface FeedRankingStatsJobData {
  triggeredAt?: string;
  forceFullRecalculate?: boolean;
}

/**
 * Refreshes 30-day author engagement statistics (avg likes, avg comments, post count).
 */
export async function refreshAuthorEngagementStats(
  db: PrismaClient,
  logger?: Logger,
): Promise<{ upsertedCount: number; resetCount: number }> {
  logger?.info("feed-ranking-stats: refreshing author_engagement_stats (last 30d)");

  // 1. Calculate and upsert 30-day stats for all authors with active posts in the last 30 days
  const upsertedCount = await db.$executeRaw`
    WITH active_posts AS (
      SELECT
        author_id,
        COUNT(id)::int AS post_cnt,
        AVG(like_count)::numeric AS avg_likes,
        AVG(comment_count)::numeric AS avg_comments
      FROM posts
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
        AND is_hidden = false
      GROUP BY author_id
    )
    INSERT INTO author_engagement_stats (
      author_user_id,
      avg_likes_per_post_30d,
      avg_comments_per_post_30d,
      post_count_30d,
      updated_at
    )
    SELECT
      author_id,
      ROUND(avg_likes, 4),
      ROUND(avg_comments, 4),
      post_cnt,
      NOW()
    FROM active_posts
    ON CONFLICT (author_user_id) DO UPDATE SET
      avg_likes_per_post_30d = EXCLUDED.avg_likes_per_post_30d,
      avg_comments_per_post_30d = EXCLUDED.avg_comments_per_post_30d,
      post_count_30d = EXCLUDED.post_count_30d,
      updated_at = NOW()
  `;

  // 2. Reset authors whose stats exist but who have 0 posts in the last 30 days
  const resetCount = await db.$executeRaw`
    UPDATE author_engagement_stats
    SET
      avg_likes_per_post_30d = 0,
      avg_comments_per_post_30d = 0,
      post_count_30d = 0,
      updated_at = NOW()
    WHERE author_user_id NOT IN (
      SELECT DISTINCT author_id
      FROM posts
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
        AND is_hidden = false
    )
    AND (post_count_30d > 0 OR avg_likes_per_post_30d > 0 OR avg_comments_per_post_30d > 0)
  `;

  logger?.info(
    { upsertedCount, resetCount },
    "feed-ranking-stats: author_engagement_stats refreshed",
  );

  return { upsertedCount, resetCount };
}

/**
 * Refreshes normalized viewer-author pairwise affinity scores from likes and comments in the last 30 days.
 * Formula: pair_interactions(viewer, author) / total_viewer_interactions(viewer)
 */
export async function refreshUserAuthorAffinity(
  db: PrismaClient,
  logger?: Logger,
): Promise<{ upsertedCount: number; prunedCount: number }> {
  logger?.info("feed-ranking-stats: refreshing user_author_affinity (last 30d)");
  const jobStartTime = new Date();

  // 1. Calculate interactions and upsert normalized affinity scores
  const upsertedCount = await db.$executeRaw`
    WITH viewer_likes AS (
      SELECT
        pl.user_id AS viewer_id,
        p.author_id AS author_id,
        COUNT(*)::numeric AS cnt
      FROM post_likes pl
      JOIN posts p ON p.id = pl.post_id
      WHERE pl.created_at >= NOW() - INTERVAL '30 days'
        AND pl.user_id != p.author_id
        AND p.deleted_at IS NULL
      GROUP BY pl.user_id, p.author_id
    ),
    viewer_comments AS (
      SELECT
        pc.user_id AS viewer_id,
        p.author_id AS author_id,
        COUNT(*)::numeric AS cnt
      FROM post_comments pc
      JOIN posts p ON p.id = pc.post_id
      WHERE pc.created_at >= NOW() - INTERVAL '30 days'
        AND pc.user_id != p.author_id
        AND p.deleted_at IS NULL
      GROUP BY pc.user_id, p.author_id
    ),
    combined AS (
      SELECT viewer_id, author_id, cnt FROM viewer_likes
      UNION ALL
      SELECT viewer_id, author_id, cnt FROM viewer_comments
    ),
    pair_totals AS (
      SELECT
        viewer_id,
        author_id,
        SUM(cnt) AS pair_cnt
      FROM combined
      GROUP BY viewer_id, author_id
    ),
    viewer_totals AS (
      SELECT
        viewer_id,
        SUM(pair_cnt) AS total_cnt
      FROM pair_totals
      GROUP BY viewer_id
    )
    INSERT INTO user_author_affinity (
      viewer_user_id,
      author_user_id,
      affinity_score,
      updated_at
    )
    SELECT
      pt.viewer_id,
      pt.author_id,
      ROUND((pt.pair_cnt / NULLIF(vt.total_cnt, 0))::numeric, 4) AS affinity_score,
      NOW()
    FROM pair_totals pt
    JOIN viewer_totals vt ON vt.viewer_id = pt.viewer_id
    WHERE vt.total_cnt > 0
    ON CONFLICT (viewer_user_id, author_user_id) DO UPDATE SET
      affinity_score = EXCLUDED.affinity_score,
      updated_at = NOW()
  `;

  // 2. Prune obsolete affinity entries that had zero interactions in the last 30 days
  const prunedCount = await db.$executeRaw`
    DELETE FROM user_author_affinity
    WHERE updated_at < ${jobStartTime}
  `;

  logger?.info(
    { upsertedCount, prunedCount },
    "feed-ranking-stats: user_author_affinity refreshed",
  );

  return { upsertedCount, prunedCount };
}

/**
 * Executes full daily feed ranking stats refresh.
 */
export async function refreshAllFeedRankingStats(
  db: PrismaClient,
  logger?: Logger,
): Promise<{
  authorStats: { upsertedCount: number; resetCount: number };
  affinity: { upsertedCount: number; prunedCount: number };
}> {
  const authorStats = await refreshAuthorEngagementStats(db, logger);
  const affinity = await refreshUserAuthorAffinity(db, logger);
  return { authorStats, affinity };
}

export function createFeedRankingStatsQueue() {
  return new Queue<FeedRankingStatsJobData>(FEED_RANKING_STATS_QUEUE, {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10000 },
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    },
  });
}

export function startFeedRankingStatsWorker(
  db: PrismaClient,
  logger: Logger,
): Worker<FeedRankingStatsJobData> {
  const worker = new Worker<FeedRankingStatsJobData>(
    FEED_RANKING_STATS_QUEUE,
    async (job) => {
      logger.info({ jobId: job.id }, "feed-ranking-stats: running daily refresh job");
      const startTime = Date.now();

      const result = await refreshAllFeedRankingStats(db, logger);

      const elapsedMs = Date.now() - startTime;
      logger.info(
        {
          jobId: job.id,
          elapsedMs,
          authorStatsUpserted: result.authorStats.upsertedCount,
          authorStatsReset: result.authorStats.resetCount,
          affinityUpserted: result.affinity.upsertedCount,
          affinityPruned: result.affinity.prunedCount,
        },
        "feed-ranking-stats: daily refresh completed successfully",
      );
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err: err.message }, "feed-ranking-stats: job failed");
  });

  return worker;
}
