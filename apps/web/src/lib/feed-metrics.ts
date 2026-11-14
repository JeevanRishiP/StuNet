/**
 * feed-metrics.ts — Online telemetry, evaluation, and rollout metrics for Feed Ranking System v2.
 *
 * Implements Section 7:
 *  - Online metrics: session-level engagement rate (Control vs Hybrid), average scroll depth
 *  - Exploration slot conversion rate vs standard ranking slot conversion rate
 *  - Active model status, training example count, validation AUC, and rollout distribution
 */

import { db } from "@/lib/db";
import { getActiveModel } from "@/lib/feed-ranking";

export interface VariantMetrics {
  variant: string;
  totalImpressions: number;
  totalSessions: number;
  engagedSessions: number;
  sessionEngagementRate: number; // 0.0 - 1.0
  avgScrollDepth: number;
}

export interface ExplorationConversionMetrics {
  explorationImpressions: number;
  explorationConversions: number;
  explorationConversionRate: number;
  standardImpressions: number;
  standardConversions: number;
  standardConversionRate: number;
}

export interface FeedPerformanceTelemetry {
  rolloutPercentage: number;
  activeModel: {
    id: string | null;
    validationAuc: number | null;
    trainingExampleCount: number;
    weight: number;
    isActive: boolean;
  } | null;
  timeWindowDays: number;
  variants: VariantMetrics[];
  exploration: ExplorationConversionMetrics;
}

/**
 * Aggregates live online ranking performance metrics across A/B test cohorts and exploration slots.
 */
export async function getFeedPerformanceMetrics(
  timeWindowDays: number = 7,
): Promise<FeedPerformanceTelemetry> {
  const activeModel = await getActiveModel();
  const rolloutPercentage = Math.max(
    0,
    Math.min(100, Number(process.env["FEED_HYBRID_ROLLOUT_PERCENT"] ?? "0")),
  );

  // 1. Session-level metrics grouped by variant (CONTROL vs HYBRID_V2)
  const variantRows = await db.$queryRaw<
    Array<{
      variant: string;
      total_impressions: bigint;
      total_sessions: bigint;
      engaged_sessions: bigint;
      avg_scroll_depth: number | null;
    }>
  >`
    WITH session_depths AS (
      SELECT
        session_id,
        MAX(rank_position)::float AS max_rank
      FROM feed_impressions
      WHERE shown_at >= NOW() - (${timeWindowDays} || ' days')::interval
      GROUP BY session_id
    ),
    engaged_impressions AS (
      SELECT DISTINCT
        fi.session_id,
        fi.variant
      FROM feed_impressions fi
      WHERE fi.shown_at >= NOW() - (${timeWindowDays} || ' days')::interval
        AND (
          EXISTS (
            SELECT 1 FROM post_likes pl
            WHERE pl.user_id = fi.user_id
              AND pl.post_id = fi.post_id
              AND pl.created_at >= fi.shown_at
              AND pl.created_at <= fi.shown_at + INTERVAL '2 hours'
          )
          OR EXISTS (
            SELECT 1 FROM post_comments pc
            WHERE pc.user_id = fi.user_id
              AND pc.post_id = fi.post_id
              AND pc.created_at >= fi.shown_at
              AND pc.created_at <= fi.shown_at + INTERVAL '2 hours'
          )
          OR EXISTS (
            SELECT 1 FROM post_views pv
            WHERE pv.user_id = fi.user_id
              AND pv.post_id = fi.post_id
              AND pv.last_viewed_at >= fi.shown_at
              AND pv.last_viewed_at <= fi.shown_at + INTERVAL '2 hours'
          )
        )
    )
    SELECT
      fi.variant,
      COUNT(fi.id) AS total_impressions,
      COUNT(DISTINCT fi.session_id) AS total_sessions,
      COUNT(DISTINCT ei.session_id) AS engaged_sessions,
      ROUND(AVG(sd.max_rank)::numeric, 2)::float AS avg_scroll_depth
    FROM feed_impressions fi
    LEFT JOIN session_depths sd ON sd.session_id = fi.session_id
    LEFT JOIN engaged_impressions ei ON ei.session_id = fi.session_id AND ei.variant = fi.variant
    WHERE fi.shown_at >= NOW() - (${timeWindowDays} || ' days')::interval
    GROUP BY fi.variant;
  `;

  const variants: VariantMetrics[] = variantRows.map((row) => {
    const totalSessions = Number(row.total_sessions);
    const engagedSessions = Number(row.engaged_sessions);
    const rate = totalSessions > 0 ? engagedSessions / totalSessions : 0.0;

    return {
      variant: row.variant,
      totalImpressions: Number(row.total_impressions),
      totalSessions,
      engagedSessions,
      sessionEngagementRate: Number(rate.toFixed(4)),
      avgScrollDepth: row.avg_scroll_depth ?? 0.0,
    };
  });

  // 2. Exploration slot conversion rate vs standard ranking slots
  const explorationRows = await db.$queryRaw<
    Array<{
      is_exploration: boolean;
      total_impressions: bigint;
      converted_impressions: bigint;
    }>
  >`
    SELECT
      fi.is_exploration,
      COUNT(fi.id) AS total_impressions,
      COUNT(CASE WHEN (
        EXISTS (
          SELECT 1 FROM post_likes pl
          WHERE pl.user_id = fi.user_id
            AND pl.post_id = fi.post_id
            AND pl.created_at >= fi.shown_at
            AND pl.created_at <= fi.shown_at + INTERVAL '2 hours'
        )
        OR EXISTS (
          SELECT 1 FROM post_comments pc
          WHERE pc.user_id = fi.user_id
            AND pc.post_id = fi.post_id
            AND pc.created_at >= fi.shown_at
            AND pc.created_at <= fi.shown_at + INTERVAL '2 hours'
        )
        OR EXISTS (
          SELECT 1 FROM post_views pv
          WHERE pv.user_id = fi.user_id
            AND pv.post_id = fi.post_id
            AND pv.last_viewed_at >= fi.shown_at
            AND pv.last_viewed_at <= fi.shown_at + INTERVAL '2 hours'
        )
      ) THEN 1 END) AS converted_impressions
    FROM feed_impressions fi
    WHERE fi.shown_at >= NOW() - (${timeWindowDays} || ' days')::interval
    GROUP BY fi.is_exploration;
  `;

  let explorationImpressions = 0;
  let explorationConversions = 0;
  let standardImpressions = 0;
  let standardConversions = 0;

  for (const row of explorationRows) {
    if (row.is_exploration) {
      explorationImpressions = Number(row.total_impressions);
      explorationConversions = Number(row.converted_impressions);
    } else {
      standardImpressions = Number(row.total_impressions);
      standardConversions = Number(row.converted_impressions);
    }
  }

  const explorationConversionRate =
    explorationImpressions > 0 ? explorationConversions / explorationImpressions : 0.0;
  const standardConversionRate =
    standardImpressions > 0 ? standardConversions / standardImpressions : 0.0;

  return {
    rolloutPercentage,
    activeModel: activeModel
      ? {
          id: activeModel.id,
          validationAuc: activeModel.validationAuc,
          trainingExampleCount: activeModel.trainingExampleCount,
          weight: activeModel.weight,
          isActive: true,
        }
      : null,
    timeWindowDays,
    variants,
    exploration: {
      explorationImpressions,
      explorationConversions,
      explorationConversionRate: Number(explorationConversionRate.toFixed(4)),
      standardImpressions,
      standardConversions,
      standardConversionRate: Number(standardConversionRate.toFixed(4)),
    },
  };
}
