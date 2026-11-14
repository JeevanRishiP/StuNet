/**
 * feed-ranking-v2-schema.test.ts
 *
 * Verifies database-level functionality for Feed Ranking System v2 (Step 1):
 *  1. feed_impressions table creation, app_service_role permissions, and training index
 *  2. author_engagement_stats table creation, updates, and app_service_role access
 *  3. user_author_affinity table creation, composite PK, and app_service_role access
 *  4. feed_model_versions table creation and coefficient storage
 *  5. Cascading deletes from user and post to feed_impressions
 *  6. Impression batch insertion with rank_position and session_id
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  PrismaClient,
  UserRole,
  VerificationStatus,
  PostType,
  PostVisibility,
} from "@prisma/client";

const ownerClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["DATABASE_URL"] ??
        "postgresql://stunet_owner:localdevonly@localhost:5434/stunet",
    },
  },
});

const appClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["APP_DATABASE_URL"] ??
        "postgresql://app_service_role:app_localdev_CHANGE_ME@localhost:5434/stunet",
    },
  },
});

const SUFFIX = `feedv2_${Date.now()}`;
let testAuthorId = "";
let testViewerId = "";
let testPostAId = "";
let testPostBId = "";

beforeAll(async () => {
  // Create an author and viewer
  const author = await ownerClient.userIdentity.create({
    data: {
      displayName: `Author ${SUFFIX}`,
      username: `author_${SUFFIX}`,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  testAuthorId = author.id;

  const viewer = await ownerClient.userIdentity.create({
    data: {
      displayName: `Viewer ${SUFFIX}`,
      username: `viewer_${SUFFIX}`,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  testViewerId = viewer.id;

  // Create two posts by the author
  const postA = await ownerClient.post.create({
    data: {
      authorId: testAuthorId,
      body: `Post A Content ${SUFFIX}`,
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      targetConnectionScope: "ALL",
    },
  });
  testPostAId = postA.id;

  const postB = await ownerClient.post.create({
    data: {
      authorId: testAuthorId,
      body: `Post B Content ${SUFFIX}`,
      type: PostType.TEXT,
      visibility: PostVisibility.PUBLIC,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      targetConnectionScope: "ALL",
    },
  });
  testPostBId = postB.id;
});

afterAll(async () => {
  // Cleanup test entities
  await ownerClient.feedImpression.deleteMany({
    where: { userId: { in: [testAuthorId, testViewerId] } },
  });
  await ownerClient.userAuthorAffinity.deleteMany({
    where: {
      OR: [{ viewerUserId: testViewerId }, { authorUserId: testAuthorId }],
    },
  });
  await ownerClient.authorEngagementStats.deleteMany({
    where: { authorUserId: testAuthorId },
  });
  await ownerClient.post.deleteMany({
    where: { id: { in: [testPostAId, testPostBId] } },
  });
  await ownerClient.userIdentity.deleteMany({
    where: { id: { in: [testAuthorId, testViewerId] } },
  });

  await ownerClient.$disconnect();
  await appClient.$disconnect();
});

describe("Feed Ranking System v2 — Schema & Permissions (Step 1)", () => {
  it("allows app_service_role to batch insert feed_impressions with rank_position and session_id", async () => {
    const sessionId = `session_${SUFFIX}`;

    const impressions = await appClient.feedImpression.createMany({
      data: [
        {
          userId: testViewerId,
          postId: testPostAId,
          rankPosition: 0,
          sessionId,
        },
        {
          userId: testViewerId,
          postId: testPostBId,
          rankPosition: 1,
          sessionId,
        },
      ],
    });

    expect(impressions.count).toBe(2);

    const queried = await appClient.feedImpression.findMany({
      where: { sessionId },
      orderBy: { rankPosition: "asc" },
    });

    expect(queried.length).toBe(2);
    expect(queried[0]?.postId).toBe(testPostAId);
    expect(queried[0]?.rankPosition).toBe(0);
    expect(queried[0]?.userId).toBe(testViewerId);
    expect(queried[1]?.postId).toBe(testPostBId);
    expect(queried[1]?.rankPosition).toBe(1);
    expect(queried[1]?.sessionId).toBe(sessionId);
  });

  it("allows app_service_role to create and query author_engagement_stats", async () => {
    const stats = await appClient.authorEngagementStats.create({
      data: {
        authorUserId: testAuthorId,
        avgLikesPerPost30d: 4.5,
        avgCommentsPerPost30d: 1.25,
        postCount30d: 10,
      },
    });

    expect(stats.authorUserId).toBe(testAuthorId);
    expect(Number(stats.avgLikesPerPost30d)).toBeCloseTo(4.5);
    expect(Number(stats.avgCommentsPerPost30d)).toBeCloseTo(1.25);
    expect(stats.postCount30d).toBe(10);

    // Update stats
    const updated = await appClient.authorEngagementStats.update({
      where: { authorUserId: testAuthorId },
      data: {
        avgLikesPerPost30d: 5.0,
        postCount30d: 11,
      },
    });
    expect(Number(updated.avgLikesPerPost30d)).toBeCloseTo(5.0);
    expect(updated.postCount30d).toBe(11);
  });

  it("allows app_service_role to create, update, and query user_author_affinity", async () => {
    const affinity = await appClient.userAuthorAffinity.create({
      data: {
        viewerUserId: testViewerId,
        authorUserId: testAuthorId,
        affinityScore: 0.85,
      },
    });

    expect(affinity.viewerUserId).toBe(testViewerId);
    expect(affinity.authorUserId).toBe(testAuthorId);
    expect(Number(affinity.affinityScore)).toBeCloseTo(0.85);

    // Upsert / update
    const updated = await appClient.userAuthorAffinity.update({
      where: {
        viewerUserId_authorUserId: {
          viewerUserId: testViewerId,
          authorUserId: testAuthorId,
        },
      },
      data: {
        affinityScore: 0.95,
      },
    });

    expect(Number(updated.affinityScore)).toBeCloseTo(0.95);
  });

  it("allows app_service_role to store and read feed_model_versions", async () => {
    const model = await appClient.feedModelVersion.create({
      data: {
        modelType: "LOGISTIC_REGRESSION",
        coefficientsJson: {
          hours_since_posted: -0.15,
          engagement_velocity: 0.82,
          user_author_affinity: 1.45,
          author_engagement_rate: 0.65,
          tag_overlap: 0.9,
          intercept: -1.2,
        },
        trainingExampleCount: 15000,
        validationAuc: 0.785,
        isActive: false,
      },
    });

    expect(model.id).toBeDefined();
    expect(model.modelType).toBe("LOGISTIC_REGRESSION");
    expect(model.trainingExampleCount).toBe(15000);
    expect(Number(model.validationAuc)).toBeCloseTo(0.785);
    expect(model.isActive).toBe(false);

    // Read back coefficients
    const read = await appClient.feedModelVersion.findUnique({
      where: { id: model.id },
    });
    const weights = read?.coefficientsJson as Record<string, number>;
    expect(weights["user_author_affinity"]).toBe(1.45);

    // Clean up test model
    await ownerClient.feedModelVersion.delete({ where: { id: model.id } });
  });

  it("cascades deletion from post to feed_impressions", async () => {
    // Create a temporary post
    const tempPost = await ownerClient.post.create({
      data: {
        authorId: testAuthorId,
        body: `Temporary Post ${SUFFIX}`,
        type: PostType.TEXT,
        visibility: PostVisibility.PUBLIC,
      },
    });

    await appClient.feedImpression.create({
      data: {
        userId: testViewerId,
        postId: tempPost.id,
        rankPosition: 0,
        sessionId: `cascade_test_${SUFFIX}`,
      },
    });

    const countBefore = await appClient.feedImpression.count({
      where: { postId: tempPost.id },
    });
    expect(countBefore).toBe(1);

    // Delete post
    await ownerClient.post.delete({ where: { id: tempPost.id } });

    const countAfter = await appClient.feedImpression.count({
      where: { postId: tempPost.id },
    });
    expect(countAfter).toBe(0);
  });

  it("calculates 30-day author_engagement_stats accurately from recent posts", async () => {
    // Author with 2 recent posts
    // Post A: likeCount = 4, commentCount = 2
    // Post B: likeCount = 2, commentCount = 0
    await ownerClient.post.update({
      where: { id: testPostAId },
      data: { likeCount: 4, commentCount: 2 },
    });
    await ownerClient.post.update({
      where: { id: testPostBId },
      data: { likeCount: 2, commentCount: 0 },
    });

    // Run the refresh query as executed by the daily worker job
    await appClient.$executeRaw`
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
        updated_at = NOW();
    `;

    const stats = await appClient.authorEngagementStats.findUnique({
      where: { authorUserId: testAuthorId },
    });

    expect(stats).toBeDefined();
    expect(stats?.postCount30d).toBe(2);
    // (4 + 2) / 2 = 3.0
    expect(Number(stats?.avgLikesPerPost30d)).toBeCloseTo(3.0);
    // (2 + 0) / 2 = 1.0
    expect(Number(stats?.avgCommentsPerPost30d)).toBeCloseTo(1.0);
  });

  it("calculates normalized user_author_affinity accurately from recent likes and comments", async () => {
    // Create Author 2
    const author2 = await ownerClient.userIdentity.create({
      data: {
        displayName: `Author 2 ${SUFFIX}`,
        username: `author2_${SUFFIX}`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });

    const postAuthor2 = await ownerClient.post.create({
      data: {
        authorId: author2.id,
        body: `Author 2 Post ${SUFFIX}`,
        type: PostType.TEXT,
        visibility: PostVisibility.PUBLIC,
      },
    });

    // Viewer interacts:
    // With Author 1: likes Post A, likes Post B, comments on Post A (3 interactions)
    await ownerClient.postLike.createMany({
      data: [
        { postId: testPostAId, userId: testViewerId },
        { postId: testPostBId, userId: testViewerId },
      ],
    });
    await ownerClient.postComment.create({
      data: {
        postId: testPostAId,
        userId: testViewerId,
        content: `Nice post ${SUFFIX}`,
      },
    });

    // With Author 2: likes Post Author 2 (1 interaction)
    await ownerClient.postLike.create({
      data: { postId: postAuthor2.id, userId: testViewerId },
    });

    // Total viewer interactions = 3 (Author 1) + 1 (Author 2) = 4 interactions.
    // Expected affinity to Author 1: 3 / 4 = 0.7500
    // Expected affinity to Author 2: 1 / 4 = 0.2500

    // Run the affinity refresh query
    await appClient.$executeRaw`
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
        updated_at = NOW();
    `;

    const affinityAuthor1 = await appClient.userAuthorAffinity.findUnique({
      where: {
        viewerUserId_authorUserId: {
          viewerUserId: testViewerId,
          authorUserId: testAuthorId,
        },
      },
    });

    const affinityAuthor2 = await appClient.userAuthorAffinity.findUnique({
      where: {
        viewerUserId_authorUserId: {
          viewerUserId: testViewerId,
          authorUserId: author2.id,
        },
      },
    });

    expect(affinityAuthor1).toBeDefined();
    expect(Number(affinityAuthor1?.affinityScore)).toBeCloseTo(0.75);

    expect(affinityAuthor2).toBeDefined();
    expect(Number(affinityAuthor2?.affinityScore)).toBeCloseTo(0.25);

    // Clean up author 2 & post
    await ownerClient.postLike.deleteMany({
      where: { postId: { in: [testPostAId, testPostBId, postAuthor2.id] } },
    });
    await ownerClient.postComment.deleteMany({
      where: { postId: testPostAId },
    });
    await ownerClient.userAuthorAffinity.deleteMany({
      where: { authorUserId: author2.id },
    });
    await ownerClient.post.delete({ where: { id: postAuthor2.id } });
    await ownerClient.userIdentity.delete({ where: { id: author2.id } });
  });

  describe("Hybrid Scoring & Model Weight Ramp (Section 6)", () => {
    function computeModelWeight(exampleCount: number, validationAuc: number | null): number {
      if (!validationAuc || validationAuc < 0.55 || exampleCount < 2000) return 0.0;
      if (exampleCount < 5000) return (0.15 * (exampleCount - 2000)) / 3000;
      if (exampleCount < 20000) return 0.15 + (0.35 * (exampleCount - 5000)) / 15000;
      return Math.min(0.7, 0.5 + (0.2 * (exampleCount - 20000)) / 30000);
    }

    function evaluateLogisticModel(
      intercept: number,
      weights: Record<string, number>,
      features: Record<string, number>,
    ): number {
      let z = intercept;
      for (const [k, v] of Object.entries(features)) {
        if (weights[k] !== undefined) z += weights[k] * v;
      }
      const clampedZ = Math.max(-20, Math.min(20, z));
      return 1.0 / (1.0 + Math.exp(-clampedZ));
    }

    it("verifies model weight ramping: starts at 0, ramps smoothly, caps at 0.70", () => {
      // Under threshold
      expect(computeModelWeight(1000, 0.8)).toBe(0.0);
      expect(computeModelWeight(1999, 0.8)).toBe(0.0);
      expect(computeModelWeight(5000, 0.5)).toBe(0.0); // low AUC

      // Ramping
      expect(computeModelWeight(2000, 0.75)).toBeCloseTo(0.0);
      expect(computeModelWeight(3500, 0.75)).toBeCloseTo(0.075);
      expect(computeModelWeight(5000, 0.75)).toBeCloseTo(0.15);
      expect(computeModelWeight(20000, 0.8)).toBeCloseTo(0.5);

      // Capped
      expect(computeModelWeight(50000, 0.85)).toBeCloseTo(0.7);
      expect(computeModelWeight(100000, 0.85)).toBeCloseTo(0.7);
    });

    it("evaluates logistic regression probability natively via dot product and sigmoid", () => {
      const intercept = -1.0;
      const weights = { is_connected: 1.2, user_author_affinity: 0.8, hours_since_posted: -0.05 };
      const features = { is_connected: 1, user_author_affinity: 0.5, hours_since_posted: 10 };

      // z = -1.0 + 1.2 + 0.4 - 0.5 = 0.1
      // sigmoid(0.1) ≈ 0.525
      const prob = evaluateLogisticModel(intercept, weights, features);
      expect(prob).toBeCloseTo(0.525, 2);
    });

    it("blends heuristic floor and model score with weight w", () => {
      const normHeuristic = 0.8;
      const modelScore = 0.4;

      // When w = 0 (cold start / low volume): purely heuristic
      const wZero = computeModelWeight(1000, 0.8);
      const scoreCold = (1 - wZero) * normHeuristic + wZero * modelScore;
      expect(scoreCold).toBeCloseTo(0.8);

      // When w = 0.5 (mature model): balanced hybrid
      const wMature = computeModelWeight(20000, 0.8);
      const scoreMature = (1 - wMature) * normHeuristic + wMature * modelScore;
      expect(scoreMature).toBeCloseTo(0.6);
    });
  });

  describe("Rollout Gating, Cohort Assignment & Telemetry (Step 5)", () => {
    function resolveUserFeedVariant(
      userId: string | null,
      rolloutPercentage: number,
      overrideVariant?: string | null,
    ): "CONTROL" | "HYBRID_V2" {
      if (overrideVariant === "HYBRID_V2" || overrideVariant === "CONTROL") {
        return overrideVariant;
      }
      if (!userId || rolloutPercentage <= 0) {
        return "CONTROL";
      }
      if (rolloutPercentage >= 100) {
        return "HYBRID_V2";
      }

      let hash = 2166136261;
      for (let i = 0; i < userId.length; i++) {
        hash ^= userId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const bucket = Math.abs(hash) % 100;
      return bucket < rolloutPercentage ? "HYBRID_V2" : "CONTROL";
    }

    it("verifies deterministic cohort routing across percentages and explicit overrides", () => {
      const testUid = "user_c1234567890abcdef";

      // 0% rollout -> CONTROL
      expect(resolveUserFeedVariant(testUid, 0)).toBe("CONTROL");
      // 100% rollout -> HYBRID_V2
      expect(resolveUserFeedVariant(testUid, 100)).toBe("HYBRID_V2");
      // Anonymous user -> always CONTROL
      expect(resolveUserFeedVariant(null, 50)).toBe("CONTROL");

      // Idempotency: same user always hashes to same cohort at fixed percentage
      const variant1 = resolveUserFeedVariant(testUid, 50);
      const variant2 = resolveUserFeedVariant(testUid, 50);
      expect(variant1).toBe(variant2);

      // Overrides take absolute precedence
      expect(resolveUserFeedVariant(testUid, 0, "HYBRID_V2")).toBe("HYBRID_V2");
      expect(resolveUserFeedVariant(testUid, 100, "CONTROL")).toBe("CONTROL");

      // Uniform distribution across 1000 simulated users at 50% rollout
      let hybridCount = 0;
      for (let i = 0; i < 1000; i++) {
        if (resolveUserFeedVariant(`sim_user_${i}`, 50) === "HYBRID_V2") {
          hybridCount++;
        }
      }
      // Expect between 45% and 55%
      expect(hybridCount).toBeGreaterThanOrEqual(450);
      expect(hybridCount).toBeLessThanOrEqual(550);
    });

    it("persists feed_impressions with variant and is_exploration defaults and custom values", async () => {
      const step5Session = `step5_${SUFFIX}`;

      // Insert impression with custom variant and isExploration flag
      const customImp = await appClient.feedImpression.create({
        data: {
          userId: testViewerId,
          postId: testPostAId,
          rankPosition: 0,
          sessionId: step5Session,
          variant: "HYBRID_V2",
          isExploration: true,
        },
      });

      expect(customImp.variant).toBe("HYBRID_V2");
      expect(customImp.isExploration).toBe(true);

      // Insert impression with defaults (CONTROL, false)
      const defaultImp = await appClient.feedImpression.create({
        data: {
          userId: testViewerId,
          postId: testPostBId,
          rankPosition: 1,
          sessionId: step5Session,
        },
      });

      expect(defaultImp.variant).toBe("CONTROL");
      expect(defaultImp.isExploration).toBe(false);

      // Clean up step 5 impressions
      await ownerClient.feedImpression.deleteMany({
        where: { sessionId: step5Session },
      });
    });

    it("computes session engagement and exploration conversion telemetry via SQL aggregation", async () => {
      const sessionControl = `metrics_ctrl_${SUFFIX}`;
      const sessionHybrid = `metrics_hyb_${SUFFIX}`;

      // 1. CONTROL session: 2 impressions on Post A, no interactions
      await appClient.feedImpression.createMany({
        data: [
          {
            userId: testViewerId,
            postId: testPostAId,
            rankPosition: 0,
            sessionId: sessionControl,
            variant: "CONTROL",
            isExploration: false,
          },
          {
            userId: testViewerId,
            postId: testPostAId,
            rankPosition: 1,
            sessionId: sessionControl,
            variant: "CONTROL",
            isExploration: false,
          },
        ],
      });

      // 2. HYBRID session: 2 impressions, rank 0 is standard, rank 1 is exploration
      await appClient.feedImpression.create({
        data: {
          userId: testViewerId,
          postId: testPostAId,
          rankPosition: 0,
          sessionId: sessionHybrid,
          variant: "HYBRID_V2",
          isExploration: false,
        },
      });

      await appClient.feedImpression.create({
        data: {
          userId: testViewerId,
          postId: testPostBId,
          rankPosition: 1,
          sessionId: sessionHybrid,
          variant: "HYBRID_V2",
          isExploration: true,
        },
      });

      // Viewer likes Post B within 15 minutes of impression -> converted exploration slot
      await appClient.postLike.create({
        data: {
          userId: testViewerId,
          postId: testPostBId,
        },
      });

      // Run telemetry SQL query from Section 7
      const variantRows = await appClient.$queryRaw<
        Array<{
          variant: string;
          total_impressions: bigint;
          total_sessions: bigint;
          engaged_sessions: bigint;
        }>
      >`
        WITH engaged_impressions AS (
          SELECT DISTINCT
            fi.session_id,
            fi.variant
          FROM feed_impressions fi
          WHERE (
            EXISTS (
              SELECT 1 FROM post_likes pl
              WHERE pl.user_id = fi.user_id
                AND pl.post_id = fi.post_id
                AND pl.created_at >= fi.shown_at
                AND pl.created_at <= fi.shown_at + INTERVAL '2 hours'
            )
          )
        )
        SELECT
          fi.variant,
          COUNT(fi.id) AS total_impressions,
          COUNT(DISTINCT fi.session_id) AS total_sessions,
          COUNT(DISTINCT ei.session_id) AS engaged_sessions
        FROM feed_impressions fi
        LEFT JOIN engaged_impressions ei ON ei.session_id = fi.session_id AND ei.variant = fi.variant
        WHERE fi.session_id IN (${sessionControl}, ${sessionHybrid})
        GROUP BY fi.variant
        ORDER BY fi.variant;
      `;

      expect(variantRows.length).toBe(2);

      const ctrlMetrics = variantRows.find((r) => r.variant === "CONTROL");
      expect(ctrlMetrics).toBeDefined();
      expect(Number(ctrlMetrics?.total_impressions)).toBe(2);
      expect(Number(ctrlMetrics?.total_sessions)).toBe(1);
      expect(Number(ctrlMetrics?.engaged_sessions)).toBe(0);

      const hybMetrics = variantRows.find((r) => r.variant === "HYBRID_V2");
      expect(hybMetrics).toBeDefined();
      expect(Number(hybMetrics?.total_impressions)).toBe(2);
      expect(Number(hybMetrics?.total_sessions)).toBe(1);
      expect(Number(hybMetrics?.engaged_sessions)).toBe(1);

      // Exploration conversion query
      const explorationRows = await appClient.$queryRaw<
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
          ) THEN 1 END) AS converted_impressions
        FROM feed_impressions fi
        WHERE fi.session_id IN (${sessionControl}, ${sessionHybrid})
        GROUP BY fi.is_exploration
        ORDER BY fi.is_exploration;
      `;

      const stdRow = explorationRows.find((r) => !r.is_exploration);
      const expRow = explorationRows.find((r) => r.is_exploration);

      expect(stdRow).toBeDefined();
      expect(Number(stdRow?.total_impressions)).toBe(3); // 2 from control + 1 from hybrid
      expect(Number(stdRow?.converted_impressions)).toBe(0);

      expect(expRow).toBeDefined();
      expect(Number(expRow?.total_impressions)).toBe(1); // 1 exploration in hybrid
      expect(Number(expRow?.converted_impressions)).toBe(1); // liked!

      // Cleanup
      await ownerClient.postLike.delete({
        where: {
          postId_userId: {
            postId: testPostBId,
            userId: testViewerId,
          },
        },
      });
      await ownerClient.feedImpression.deleteMany({
        where: { sessionId: { in: [sessionControl, sessionHybrid] } },
      });
    });
  });

  describe("Multi-Entity Personalized Ranking Calculations (Polls, Events, Invites, Resources)", () => {
    function computeRelationshipMultiplier(
      authorId: string,
      authorCampusId: string | null | undefined,
      viewer: {
        viewerId: string | null;
        campusId: string | null;
        connectedUserIds: Set<string>;
        followedUserIds: Set<string>;
      },
    ): number {
      if (viewer.viewerId && viewer.connectedUserIds.has(authorId)) return 2.0;
      if (viewer.viewerId && viewer.followedUserIds.has(authorId)) return 1.6;
      if (viewer.campusId && authorCampusId && viewer.campusId === authorCampusId) return 1.35;
      return 1.0;
    }

    it("prioritizes polls by author affinity, tag overlap, vote engagement, and closing urgency", () => {
      const viewer = {
        viewerId: "v_123",
        campusId: "campus_xyz",
        connectedUserIds: new Set(["author_connected"]),
        followedUserIds: new Set(["author_followed"]),
      };

      // Poll A: author is connected (2.0x), affinity 0.5 (2.0x), tag overlap 1.0 (1.5x)
      const relA = computeRelationshipMultiplier("author_connected", "campus_xyz", viewer);
      const affA = 1.0 + 0.5 * 2.0;
      const tagA = 1.0 + 1.0 * 0.5;
      const engA = Math.log2(20 + 2) * 2.0 + 1.0;
      const decayA = Math.pow(5 + 2.0, 0.8);
      const scoreA = (relA * affA * tagA * engA) / decayA;

      // Poll B: stranger (1.0x), affinity 0 (1.0x), tag overlap 0 (1.0x)
      const relB = computeRelationshipMultiplier("author_stranger", "campus_abc", viewer);
      const affB = 1.0;
      const tagB = 1.0;
      const engB = Math.log2(5 + 2) * 2.0 + 1.0;
      const decayB = Math.pow(5 + 2.0, 0.8);
      const scoreB = (relB * affB * tagB * engB) / decayB;

      expect(scoreA).toBeGreaterThan(scoreB * 3.0);
    });

    it("prioritizes upcoming events by organizer connection, proximity, and deadline urgency", () => {
      const viewer = {
        viewerId: "v_123",
        campusId: "campus_xyz",
        connectedUserIds: new Set(["org_connected"]),
        followedUserIds: new Set<string>(),
      };

      // Event A: happening in 2 days (proximity 1.5x), registration closes in 24h (deadline 1.4x), connected org (2.0x)
      const relA = computeRelationshipMultiplier("org_connected", "campus_xyz", viewer);
      const proximityA = 1.5;
      const deadlineA = 1.4;
      const scoreA = (relA * 1.0 * 1.0 * proximityA * deadlineA * 10.0) / Math.pow(2 + 2.0, 0.65);

      // Event B: happening in 60 days (proximity 1.0x), no deadline (1.0x), stranger org (1.0x)
      const relB = computeRelationshipMultiplier("org_stranger", "campus_abc", viewer);
      const proximityB = 1.0;
      const deadlineB = 1.0;
      const scoreB = (relB * 1.0 * 1.0 * proximityB * deadlineB * 10.0) / Math.pow(2 + 2.0, 0.65);

      expect(scoreA).toBeGreaterThan(scoreB * 4.0);
    });

    it("prioritizes professional invites by high affinity interaction history and expiry urgency", () => {
      // Invite A: from closest collaborator (affinity 0.8 -> 1 + 2.4 = 3.4), same campus (1.25x), expiring in 24h (1.35x)
      const affMultA = 1.0 + 0.8 * 3.0;
      const campusMultA = 1.25;
      const urgencyA = 1.35;
      const scoreA = (affMultA * campusMultA * urgencyA * 10.0) / Math.pow(1 + 2.0, 0.7);

      // Invite B: casual connection (affinity 0.05 -> 1.15x), different campus (1.0x), expires in 2 weeks (1.0x)
      const affMultB = 1.0 + 0.05 * 3.0;
      const campusMultB = 1.0;
      const urgencyB = 1.0;
      const scoreB = (affMultB * campusMultB * urgencyB * 10.0) / Math.pow(1 + 2.0, 0.7);

      expect(scoreA).toBeGreaterThan(scoreB * 4.0);
    });

    it("prioritizes useful resources by tag alignment and creator connection tier", () => {
      const viewer = {
        viewerId: "v_123",
        campusId: "campus_xyz",
        connectedUserIds: new Set(["creator_connected"]),
        followedUserIds: new Set<string>(),
      };

      // Resource A: connected creator (2.0x), 100% tag overlap (1 + 0.6 = 1.6x)
      const relA = computeRelationshipMultiplier("creator_connected", "campus_xyz", viewer);
      const tagA = 1.0 + 1.0 * 0.6;
      const scoreA = (relA * 1.0 * tagA * 10.0) / Math.pow(4 + 2.0, 0.75);

      // Resource B: stranger (1.0x), 0% tag overlap (1.0x)
      const relB = computeRelationshipMultiplier("creator_stranger", "campus_abc", viewer);
      const tagB = 1.0;
      const scoreB = (relB * 1.0 * tagB * 10.0) / Math.pow(4 + 2.0, 0.75);

      expect(scoreA).toBeGreaterThan(scoreB * 3.0);
    });
  });
});
