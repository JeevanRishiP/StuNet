/**
 * feed-ranking.ts — Feed Ranking System v2: Hybrid Heuristic + Learned Ranking Model.
 *
 * Implements Sections 4, 6, & 8 of the design specification:
 *  - Stage 2: Batch feature extraction per (viewer, candidate) pair
 *  - Stage 3: Hybrid score blending:
 *       final_score = (1 - w) * norm_heuristic + w * model_score
 *       where w smoothly scales from 0.0 to 0.70 based on active model training volume and AUC.
 *  - Exploration slots: Reserves 1-2 slots per feed page for candidates outside the top-ranked set (epsilon-greedy).
 *
 * Security:
 *  - ALWAYS executed strictly AFTER database and memory-level visibility filtering (canViewerAccessPost).
 *  - Visibility-filtered candidates only — forbidden posts can NEVER be ranked or served.
 */

import { db } from "@/lib/db";
import type { ViewerContext } from "@/lib/post-access";

export type FeedRankingVariant = "CONTROL" | "HYBRID_V2";

export interface ModelCoefficients {
  features: Record<string, number>;
  intercept: number;
  feature_order?: string[];
}

export interface ActiveModelMetadata {
  id: string;
  coefficients: ModelCoefficients;
  trainingExampleCount: number;
  validationAuc: number | null;
  weight: number;
  cachedAt: number;
}

export interface CandidatePost {
  id: string;
  authorId: string;
  body?: string | null;
  type: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
  targetConnectionScope: string;
  targetRoles: string[];
  batch?: string | null;
  isAnonymous: boolean;
  companyId?: string | null;
  openSourceProjectId?: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  author: {
    id: string;
    role: string;
    campusId?: string | null;
    displayName?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    headline?: string | null;
    verificationStatus?: string | null;
    campus?: { slug: string; name: string } | null;
    joiningYear?: number | null;
    section?: string | null;
  };
  [key: string]: unknown;
}

export interface ScoredCandidate {
  post: CandidatePost;
  heuristicScore: number;
  normHeuristicScore: number;
  modelScore: number;
  finalScore: number;
  isExploration: boolean;
}

// ── In-Memory Active Model Cache (60s TTL) ──────────────────────────────────
let activeModelCache: ActiveModelMetadata | null = null;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Resolves user ranking variant (Section 7 Rollout):
 *  - CONTROL: pure baseline heuristic ranking (w = 0, no exploration slots).
 *  - HYBRID_V2: learned model hybrid blend (w > 0 when active model exists) + exploration slots.
 *
 * Deterministically hashes user ID to bucket 0..99 for consistent A/B cohort assignment.
 */
export function resolveUserFeedVariant(
  userId: string | null,
  rolloutPercentage: number = Number(process.env["FEED_HYBRID_ROLLOUT_PERCENT"] ?? "0"),
  overrideVariant?: string | null,
): FeedRankingVariant {
  if (overrideVariant === "HYBRID_V2" || overrideVariant === "CONTROL") {
    return overrideVariant;
  }
  if (!userId || rolloutPercentage <= 0) {
    return "CONTROL";
  }
  if (rolloutPercentage >= 100) {
    return "HYBRID_V2";
  }

  // Deterministic 32-bit FNV-1a hash mod 100
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bucket = Math.abs(hash) % 100;
  return bucket < rolloutPercentage ? "HYBRID_V2" : "CONTROL";
}

/**
 * Computes model weight w (Section 6):
 *  - w = 0.0 below 2,000 examples or if validation AUC < 0.55
 *  - w ramps gradually from 0.0 to 0.70 as training volume increases
 */
export function computeModelWeight(exampleCount: number, validationAuc: number | null): number {
  if (!validationAuc || validationAuc < 0.55 || exampleCount < 2000) {
    return 0.0;
  }
  if (exampleCount < 5000) {
    return (0.15 * (exampleCount - 2000)) / 3000;
  }
  if (exampleCount < 20000) {
    return 0.15 + (0.35 * (exampleCount - 5000)) / 15000;
  }
  // Cap at 0.70 so the heuristic floor always retains at least 30% authority
  return Math.min(0.7, 0.5 + (0.2 * (exampleCount - 20000)) / 30000);
}

/**
 * Loads the currently active model from feed_model_versions (cached in memory).
 */
export async function getActiveModel(): Promise<ActiveModelMetadata | null> {
  const now = Date.now();
  if (activeModelCache && now - activeModelCache.cachedAt < CACHE_TTL_MS) {
    return activeModelCache;
  }

  try {
    const row = await db.feedModelVersion.findFirst({
      where: { isActive: true },
      orderBy: { trainedAt: "desc" },
    });

    if (!row) {
      activeModelCache = null;
      return null;
    }

    const rawCoeffs = row.coefficientsJson as unknown as ModelCoefficients;
    const auc = row.validationAuc ? Number(row.validationAuc) : null;
    const weight = computeModelWeight(row.trainingExampleCount, auc);

    activeModelCache = {
      id: row.id,
      coefficients: rawCoeffs,
      trainingExampleCount: row.trainingExampleCount,
      validationAuc: auc,
      weight,
      cachedAt: now,
    };

    return activeModelCache;
  } catch (err) {
    console.error("[FeedRanking] Failed to load active model:", err);
    return null;
  }
}

/**
 * Evaluates the logistic regression dot product and sigmoid.
 */
export function evaluateLogisticModel(
  coefficients: ModelCoefficients,
  features: Record<string, number>,
): number {
  let z = coefficients.intercept;
  const weights = coefficients.features;

  for (const [feat, val] of Object.entries(features)) {
    if (weights[feat] !== undefined) {
      z += weights[feat] * val;
    }
  }

  // Clamped sigmoid
  const clampedZ = Math.max(-20, Math.min(20, z));
  return 1.0 / (1.0 + Math.exp(-clampedZ));
}

/**
 * Computes heuristic score for a post given viewer context and features.
 */
export function computeHeuristicScore(
  post: CandidatePost,
  viewer: ViewerContext,
  affinity: number,
  tagOverlap: number,
  hoursSincePosted: number,
): number {
  const isConnected = viewer.viewerId ? viewer.connectedUserIds.has(post.authorId) : false;
  const isFollowing = viewer.viewerId ? viewer.followedUserIds.has(post.authorId) : false;
  const isFollowedCompany = Boolean(
    viewer.viewerId && post.companyId && viewer.followedCompanyIds?.has(post.companyId),
  );
  const isFollowedProject = Boolean(
    viewer.viewerId &&
    post.openSourceProjectId &&
    viewer.followedProjectIds?.has(post.openSourceProjectId),
  );
  const isSameCampus = Boolean(
    viewer.campusId && post.author.campusId && viewer.campusId === post.author.campusId,
  );

  let relationshipMultiplier = 1.0;
  if (isFollowedCompany || isFollowedProject) {
    // Strong algorithm boost for followed startups and open source projects
    relationshipMultiplier = 2.4;
  } else if (isConnected) {
    relationshipMultiplier = 2.0;
  } else if (isFollowing) {
    relationshipMultiplier = 1.6;
  } else if (isSameCampus) {
    relationshipMultiplier = 1.35;
  }

  const affinityMultiplier = 1.0 + affinity * 2.0;
  const tagMultiplier = 1.0 + tagOverlap * 0.5;
  const engagement = (post.likeCount ?? 0) + (post.commentCount ?? 0) * 2.0 + 1.0;
  const recencyDecay = Math.pow(hoursSincePosted + 2.0, 0.8);

  return (relationshipMultiplier * affinityMultiplier * tagMultiplier * engagement) / recencyDecay;
}

/**
 * Ranks visibility-verified candidate posts using the hybrid model + exploration slots.
 */
export async function rankAndReorderCandidates(
  candidates: CandidatePost[],
  viewer: ViewerContext,
  limit: number,
  options?: {
    variant?: FeedRankingVariant;
    forceExploration?: boolean;
  },
): Promise<{
  rankedPosts: CandidatePost[];
  scoredItems: ScoredCandidate[];
  assignedVariant: FeedRankingVariant;
  modelWeight: number;
  modelVersionId: string | null;
}> {
  const assignedVariant = options?.variant ?? resolveUserFeedVariant(viewer.viewerId);

  if (candidates.length <= 1) {
    const scoredItems = candidates.map((p) => ({
      post: p,
      heuristicScore: 1,
      normHeuristicScore: 1,
      modelScore: 0.5,
      finalScore: 1,
      isExploration: false,
    }));
    return {
      rankedPosts: candidates,
      scoredItems,
      assignedVariant,
      modelWeight: 0.0,
      modelVersionId: null,
    };
  }

  const activeModel = await getActiveModel();
  // If user is in CONTROL group, model weight is strictly 0.0 (pure heuristic)
  const w = assignedVariant === "HYBRID_V2" && activeModel ? activeModel.weight : 0.0;
  const allowExploration = assignedVariant === "HYBRID_V2" || Boolean(options?.forceExploration);
  const now = new Date();

  // ── Stage 2: Batch query precomputed feature tables ───────────────────────
  const authorIds = Array.from(new Set(candidates.map((c) => c.authorId)));
  const postIds = candidates.map((c) => c.id);

  const [affinityRows, authorStatsRows, postTaggables, viewerTaggables] = await Promise.all([
    viewer.viewerId
      ? db.userAuthorAffinity.findMany({
          where: {
            viewerUserId: viewer.viewerId,
            authorUserId: { in: authorIds },
          },
        })
      : Promise.resolve([]),
    db.authorEngagementStats.findMany({
      where: { authorUserId: { in: authorIds } },
    }),
    db.taggable.findMany({
      where: {
        taggableType: "POST",
        taggableId: { in: postIds },
      },
      select: { taggableId: true, tagId: true },
    }),
    viewer.viewerId
      ? db.$queryRaw<{ tag_id: string }[]>`
          SELECT DISTINCT t.tag_id
          FROM taggables t
          WHERE t.taggable_type = 'POST'
            AND (
              EXISTS (
                SELECT 1 FROM post_likes pl
                WHERE pl.post_id = t.taggable_id AND pl.user_id = ${viewer.viewerId}
              )
              OR EXISTS (
                SELECT 1 FROM post_comments pc
                WHERE pc.post_id = t.taggable_id AND pc.user_id = ${viewer.viewerId}
              )
            )
        `
      : Promise.resolve([]),
  ]);

  const affinityMap = new Map<string, number>();
  for (const a of affinityRows) {
    affinityMap.set(a.authorUserId, Number(a.affinityScore));
  }

  const authorStatsMap = new Map<string, number>();
  for (const s of authorStatsRows) {
    authorStatsMap.set(s.authorUserId, Number(s.avgLikesPerPost30d ?? 0));
  }

  const viewerEngagedTagIds = new Set(viewerTaggables.map((t) => t.tag_id));
  const postTagsMap = new Map<string, string[]>();
  for (const pt of postTaggables) {
    const list = postTagsMap.get(pt.taggableId) ?? [];
    list.push(pt.tagId);
    postTagsMap.set(pt.taggableId, list);
  }

  // ── Stage 3: Compute raw features & heuristic scores ───────────────────────
  const scoredRaw: Array<{
    post: CandidatePost;
    heuristic: number;
    modelScore: number;
    features: Record<string, number>;
  }> = [];

  for (const post of candidates) {
    const hoursSincePosted = Math.max(
      0.01,
      (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const affinity = affinityMap.get(post.authorId) ?? 0.0;
    const authorStatsRate = authorStatsMap.get(post.authorId) ?? 0.0;

    const postTags = postTagsMap.get(post.id) ?? [];
    let tagOverlap = 0.0;
    if (postTags.length > 0 && viewerEngagedTagIds.size > 0) {
      const matchCount = postTags.filter((tid) => viewerEngagedTagIds.has(tid)).length;
      tagOverlap = matchCount / postTags.length;
    }

    const isConnected = viewer.viewerId ? viewer.connectedUserIds.has(post.authorId) : false;
    const isSameCampus = Boolean(
      viewer.campusId && post.author.campusId && viewer.campusId === post.author.campusId,
    );

    const heuristic = computeHeuristicScore(post, viewer, affinity, tagOverlap, hoursSincePosted);

    let modelScore = 0.5;
    if (activeModel && activeModel.coefficients) {
      const features: Record<string, number> = {
        hours_since_posted: hoursSincePosted,
        like_count: post.likeCount ?? 0,
        comment_count: post.commentCount ?? 0,
        view_count: post.viewCount ?? 0,
        engagement_velocity:
          ((post.likeCount ?? 0) + (post.commentCount ?? 0) * 2.0) /
          Math.max(1.0, hoursSincePosted),
        is_connected: isConnected ? 1.0 : 0.0,
        is_same_campus: isSameCampus && !isConnected ? 1.0 : 0.0,
        user_author_affinity: affinity,
        author_engagement_rate: authorStatsRate,
        tag_overlap: tagOverlap,
        hour_of_day: now.getUTCHours(),
        day_of_week: now.getUTCDay(),
        is_anonymous: post.isAnonymous ? 1.0 : 0.0,
      };

      modelScore = evaluateLogisticModel(activeModel.coefficients, features);
    }

    scoredRaw.push({
      post,
      heuristic,
      modelScore,
      features: {},
    });
  }

  // Min-max normalization for heuristic score across this candidate batch
  let minHeuristic = Infinity;
  let maxHeuristic = -Infinity;
  for (const item of scoredRaw) {
    if (item.heuristic < minHeuristic) minHeuristic = item.heuristic;
    if (item.heuristic > maxHeuristic) maxHeuristic = item.heuristic;
  }
  const range = maxHeuristic - minHeuristic;

  const scored: ScoredCandidate[] = scoredRaw.map((item) => {
    const normHeuristic = range > 0 ? (item.heuristic - minHeuristic) / range : 0.5;
    const finalScore = (1.0 - w) * normHeuristic + w * item.modelScore;

    return {
      post: item.post,
      heuristicScore: item.heuristic,
      normHeuristicScore: normHeuristic,
      modelScore: item.modelScore,
      finalScore,
      isExploration: false,
    };
  });

  // Sort descending by finalScore
  scored.sort((a, b) => b.finalScore - a.finalScore);

  // If user is in CONTROL group or candidates <= limit, exploration is disabled
  if (!allowExploration || scored.length <= limit) {
    const truncated = scored.slice(0, limit);
    return {
      rankedPosts: truncated.map((s) => s.post),
      scoredItems: truncated,
      assignedVariant,
      modelWeight: w,
      modelVersionId: activeModel?.id ?? null,
    };
  }

  // ── Exploration Slots: Reserve 1-2 slots for diverse candidates (Section 6) ─
  const explorationSlotsCount = limit >= 10 ? 2 : 1;
  const primaryCount = Math.max(1, limit - explorationSlotsCount);

  const primarySlice = scored.slice(0, primaryCount);
  const remainingCandidates = scored.slice(primaryCount);

  // Randomly pick exploration candidates from the remaining pool
  const explorationCandidates: ScoredCandidate[] = [];
  const poolCopy = [...remainingCandidates];

  for (let i = 0; i < explorationSlotsCount && poolCopy.length > 0; i++) {
    const randIdx = Math.floor(Math.random() * poolCopy.length);
    const chosen = poolCopy.splice(randIdx, 1)[0];
    if (chosen) {
      chosen.isExploration = true;
      explorationCandidates.push(chosen);
    }
  }

  // Interleave exploration candidates into the served page (e.g. at position 4 and position 12)
  const finalScoredList: ScoredCandidate[] = [...primarySlice];
  const insertPositions = [Math.floor(limit / 3), Math.floor((2 * limit) / 3)];

  for (let i = 0; i < explorationCandidates.length; i++) {
    const candidate = explorationCandidates[i];
    if (candidate) {
      const pos = Math.min(insertPositions[i] ?? finalScoredList.length, finalScoredList.length);
      finalScoredList.splice(pos, 0, candidate);
    }
  }

  const truncated = finalScoredList.slice(0, limit);
  const rankedPosts = truncated.map((s) => s.post);

  return {
    rankedPosts,
    scoredItems: truncated,
    assignedVariant,
    modelWeight: w,
    modelVersionId: activeModel?.id ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Entity Personalized Ranking (Polls, Events, Invites, Resources)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the set of tag IDs the viewer has engaged with via likes or comments.
 */
export async function getViewerEngagedTagIds(viewerId: string | null): Promise<Set<string>> {
  if (!viewerId) return new Set();
  try {
    const rows = await db.$queryRaw<{ tag_id: string }[]>`
      SELECT DISTINCT t.tag_id
      FROM taggables t
      WHERE (
        EXISTS (
          SELECT 1 FROM post_likes pl
          WHERE pl.post_id = t.taggable_id AND pl.user_id = ${viewerId}
        )
        OR EXISTS (
          SELECT 1 FROM post_comments pc
          WHERE pc.post_id = t.taggable_id AND pc.user_id = ${viewerId}
        )
      )
    `;
    return new Set(rows.map((r) => r.tag_id));
  } catch (err) {
    console.error("Failed to query viewer engaged tags:", err);
    return new Set();
  }
}

/**
 * Computes relationship multiplier based on direct connection, following, and campus.
 */
export function computeRelationshipMultiplier(
  authorId: string,
  authorCampusId: string | null | undefined,
  viewer: ViewerContext,
): number {
  if (viewer.viewerId && viewer.connectedUserIds.has(authorId)) return 2.0;
  if (viewer.viewerId && viewer.followedUserIds.has(authorId)) return 1.6;
  if (viewer.campusId && authorCampusId && viewer.campusId === authorCampusId) return 1.35;
  return 1.0;
}

// ── Polls Ranking ─────────────────────────────────────────────────────────────

export interface CandidatePoll {
  id: string;
  question: string;
  geoScope: string;
  scopeLabel?: string | null;
  campusId?: string | null;
  targetConnectionScope: string;
  targetRoles: string[];
  closesAt?: Date | null;
  createdAt: Date;
  post: {
    id: string;
    authorId: string;
    likeCount?: number | null;
    commentCount?: number | null;
    viewCount?: number | null;
    createdAt?: Date;
    author: {
      id: string;
      role: string;
      campusId?: string | null;
      displayName?: string | null;
      username?: string | null;
      avatarUrl?: string | null;
      campus?: { id?: string; name?: string; slug?: string; city?: string; state?: string } | null;
    };
  };
  options: Array<{
    id: string;
    text: string;
    sortOrder: number;
    _count?: { entries: number };
  }>;
  [key: string]: unknown;
}

export async function rankPollCandidates<T extends CandidatePoll>(
  candidates: T[],
  viewer: ViewerContext,
  limit: number,
  options?: { sort?: string | null },
): Promise<T[]> {
  if (candidates.length <= 1 || options?.sort === "recent") {
    return candidates.slice(0, limit);
  }

  const now = new Date();
  const authorIds = Array.from(new Set(candidates.map((c) => c.post.authorId)));
  const pollIds = candidates.map((c) => c.id);
  const postIds = candidates.map((c) => c.post.id);

  const [affinityRows, viewerEngagedTagIds, pollTaggables] = await Promise.all([
    viewer.viewerId && authorIds.length > 0
      ? db.userAuthorAffinity.findMany({
          where: { viewerUserId: viewer.viewerId, authorUserId: { in: authorIds } },
        })
      : Promise.resolve([]),
    getViewerEngagedTagIds(viewer.viewerId),
    db.taggable.findMany({
      where: {
        OR: [
          { taggableType: "POLL", taggableId: { in: pollIds } },
          { taggableType: "POST", taggableId: { in: postIds } },
        ],
      },
      select: { taggableId: true, tagId: true },
    }),
  ]);

  const affinityMap = new Map<string, number>();
  for (const a of affinityRows) {
    affinityMap.set(a.authorUserId, Number(a.affinityScore));
  }

  const tagsByPollId = new Map<string, Set<string>>();
  for (const pt of pollTaggables) {
    for (const c of candidates) {
      if (c.id === pt.taggableId || c.post.id === pt.taggableId) {
        const s = tagsByPollId.get(c.id) ?? new Set<string>();
        s.add(pt.tagId);
        tagsByPollId.set(c.id, s);
      }
    }
  }

  const scored = candidates.map((poll) => {
    const hoursSinceCreated = Math.max(
      0.01,
      (now.getTime() - new Date(poll.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const authorId = poll.post.authorId;
    const authorCampusId = poll.post.author.campusId ?? poll.campusId;
    const affinity = affinityMap.get(authorId) ?? 0.0;
    const relationshipMultiplier = computeRelationshipMultiplier(authorId, authorCampusId, viewer);
    const affinityMultiplier = 1.0 + affinity * 2.0;

    const pollTags = Array.from(tagsByPollId.get(poll.id) ?? []);
    let tagOverlap = 0.0;
    if (pollTags.length > 0 && viewerEngagedTagIds.size > 0) {
      const matchCount = pollTags.filter((tid) => viewerEngagedTagIds.has(tid)).length;
      tagOverlap = matchCount / pollTags.length;
    }
    const tagMultiplier = 1.0 + tagOverlap * 0.5;

    let urgencyMultiplier = 1.0;
    if (poll.closesAt) {
      const hoursToClose = (new Date(poll.closesAt).getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToClose > 0 && hoursToClose <= 48) {
        urgencyMultiplier = 1.3;
      }
    }

    const totalVotes = poll.options.reduce((sum, o) => sum + (o._count?.entries ?? 0), 0);
    const engagement =
      Math.log2(totalVotes + 2) * 2.0 +
      (poll.post.likeCount ?? 0) +
      (poll.post.commentCount ?? 0) * 2.0 +
      1.0;
    const recencyDecay = Math.pow(hoursSinceCreated + 2.0, 0.8);

    const score =
      (relationshipMultiplier *
        affinityMultiplier *
        tagMultiplier *
        urgencyMultiplier *
        engagement) /
      recencyDecay;

    return { poll, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length <= limit) {
    return scored.map((s) => s.poll);
  }

  const primary = scored.slice(0, limit - 1);
  const remaining = scored.slice(limit - 1);
  const randIdx = Math.floor(Math.random() * remaining.length);
  const exploration = remaining[randIdx]?.poll;

  const result = primary.map((s) => s.poll);
  if (exploration) {
    const insertPos = Math.min(Math.floor(limit / 2), result.length);
    result.splice(insertPos, 0, exploration);
  }
  return result.slice(0, limit);
}

// ── Events Ranking ────────────────────────────────────────────────────────────

export interface CandidateEvent {
  id: string;
  organizerUserId: string;
  name: string;
  description?: string | null;
  mode: string;
  type: string;
  eventDate: Date | string;
  registrationDeadline?: Date | string | null;
  location?: string | null;
  createdAt: Date | string;
  organizer: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    campusId?: string | null;
    campus?: { id?: string; name?: string; slug?: string } | null;
  };
  [key: string]: unknown;
}

export async function rankEventCandidates<T extends CandidateEvent>(
  candidates: T[],
  viewer: ViewerContext,
  limit: number,
  options?: { sort?: string | null },
): Promise<T[]> {
  if (candidates.length <= 1 || options?.sort === "date") {
    return candidates.slice(0, limit);
  }

  const now = new Date();
  const organizerIds = Array.from(new Set(candidates.map((c) => c.organizerUserId)));
  const eventIds = candidates.map((c) => c.id);

  const [affinityRows, viewerEngagedTagIds, eventTaggables] = await Promise.all([
    viewer.viewerId && organizerIds.length > 0
      ? db.userAuthorAffinity.findMany({
          where: { viewerUserId: viewer.viewerId, authorUserId: { in: organizerIds } },
        })
      : Promise.resolve([]),
    getViewerEngagedTagIds(viewer.viewerId),
    db.taggable.findMany({
      where: {
        taggableType: "EVENT",
        taggableId: { in: eventIds },
      },
      select: { taggableId: true, tagId: true },
    }),
  ]);

  const affinityMap = new Map<string, number>();
  for (const a of affinityRows) {
    affinityMap.set(a.authorUserId, Number(a.affinityScore));
  }

  const tagsByEventId = new Map<string, string[]>();
  for (const et of eventTaggables) {
    const list = tagsByEventId.get(et.taggableId) ?? [];
    list.push(et.tagId);
    tagsByEventId.set(et.taggableId, list);
  }

  const scored = candidates.map((event) => {
    const hoursSinceCreated = Math.max(
      0.01,
      (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const organizerId = event.organizerUserId;
    const organizerCampusId = event.organizer.campusId;
    const affinity = affinityMap.get(organizerId) ?? 0.0;
    const relationshipMultiplier = computeRelationshipMultiplier(
      organizerId,
      organizerCampusId,
      viewer,
    );
    const affinityMultiplier = 1.0 + affinity * 2.0;

    const eventTags = tagsByEventId.get(event.id) ?? [];
    let tagOverlap = 0.0;
    if (eventTags.length > 0 && viewerEngagedTagIds.size > 0) {
      const matchCount = eventTags.filter((tid) => viewerEngagedTagIds.has(tid)).length;
      tagOverlap = matchCount / eventTags.length;
    }
    const tagMultiplier = 1.0 + tagOverlap * 0.5;

    // Proximity to event date (happening within 3-7 days gets boosted)
    const daysUntilEvent =
      (new Date(event.eventDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    let proximityMultiplier = 1.0;
    if (daysUntilEvent >= 0 && daysUntilEvent <= 3) proximityMultiplier = 1.5;
    else if (daysUntilEvent > 3 && daysUntilEvent <= 7) proximityMultiplier = 1.35;
    else if (daysUntilEvent > 7 && daysUntilEvent <= 14) proximityMultiplier = 1.15;

    // Deadline urgency (registration closing within 48h)
    let deadlineMultiplier = 1.0;
    if (event.registrationDeadline) {
      const hoursToDeadline =
        (new Date(event.registrationDeadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToDeadline > 0 && hoursToDeadline <= 48) {
        deadlineMultiplier = 1.4;
      }
    }

    const freshnessDecay = Math.pow(hoursSinceCreated + 2.0, 0.65);
    const score =
      (relationshipMultiplier *
        affinityMultiplier *
        tagMultiplier *
        proximityMultiplier *
        deadlineMultiplier *
        10.0) /
      freshnessDecay;

    return { event, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length <= limit) {
    return scored.map((s) => s.event);
  }

  const primary = scored.slice(0, limit - 1);
  const remaining = scored.slice(limit - 1);
  const randIdx = Math.floor(Math.random() * remaining.length);
  const exploration = remaining[randIdx]?.event;

  const result = primary.map((s) => s.event);
  if (exploration) {
    const insertPos = Math.min(Math.floor(limit / 2), result.length);
    result.splice(insertPos, 0, exploration);
  }
  return result.slice(0, limit);
}

// ── Invites Ranking ───────────────────────────────────────────────────────────

export interface CandidateInvite {
  id: string;
  creatorUserId: string;
  name: string;
  description?: string | null;
  mode: string;
  type: string;
  requirements?: string | null;
  eventDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
  location?: string | null;
  expiresAt?: Date | string | null;
  createdAt: Date | string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    campusId?: string | null;
    campus?: { id?: string; name?: string; slug?: string } | null;
  };
  [key: string]: unknown;
}

export async function rankInviteCandidates<T extends CandidateInvite>(
  candidates: T[],
  viewer: ViewerContext,
  limit: number,
  options?: { sort?: string | null },
): Promise<T[]> {
  if (candidates.length <= 1 || options?.sort === "recent") {
    return candidates.slice(0, limit);
  }

  const now = new Date();
  const creatorIds = Array.from(new Set(candidates.map((c) => c.creatorUserId)));

  const affinityRows =
    viewer.viewerId && creatorIds.length > 0
      ? await db.userAuthorAffinity.findMany({
          where: { viewerUserId: viewer.viewerId, authorUserId: { in: creatorIds } },
        })
      : [];

  const affinityMap = new Map<string, number>();
  for (const a of affinityRows) {
    affinityMap.set(a.authorUserId, Number(a.affinityScore));
  }

  const scored = candidates.map((invite) => {
    const hoursSinceCreated = Math.max(
      0.01,
      (now.getTime() - new Date(invite.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const creatorId = invite.creatorUserId;
    const affinity = affinityMap.get(creatorId) ?? 0.0;
    // Strong affinity boost for trusted connection team-ups
    const affinityMultiplier = 1.0 + affinity * 3.0;

    const isSameCampus = Boolean(
      viewer.campusId && invite.creator.campusId && viewer.campusId === invite.creator.campusId,
    );
    const campusMultiplier = isSameCampus ? 1.25 : 1.0;

    let expiryMultiplier = 1.0;
    if (invite.expiresAt) {
      const hoursToExpiry =
        (new Date(invite.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursToExpiry > 0 && hoursToExpiry <= 72) {
        expiryMultiplier = 1.35;
      }
    }

    const freshnessDecay = Math.pow(hoursSinceCreated + 2.0, 0.7);
    const score =
      (affinityMultiplier * campusMultiplier * expiryMultiplier * 10.0) / freshnessDecay;

    return { invite, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.invite);
}

// ── Useful Resources Ranking ──────────────────────────────────────────────────

export interface CandidateResource {
  id: string;
  createdByUserId: string;
  category: string;
  title: string;
  url?: string | null;
  description?: string | null;
  createdAt: Date | string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
    campusId?: string | null;
    campus?: { id?: string; name?: string; slug?: string } | null;
  };
  [key: string]: unknown;
}

export async function rankResourceCandidates<T extends CandidateResource>(
  candidates: T[],
  viewer: ViewerContext,
  limit: number,
  options?: { sort?: string | null },
): Promise<T[]> {
  if (candidates.length <= 1 || options?.sort === "recent") {
    return candidates.slice(0, limit);
  }

  const now = new Date();
  const creatorIds = Array.from(new Set(candidates.map((c) => c.createdByUserId)));
  const resourceIds = candidates.map((c) => c.id);

  const [affinityRows, viewerEngagedTagIds, resourceTaggables] = await Promise.all([
    viewer.viewerId && creatorIds.length > 0
      ? db.userAuthorAffinity.findMany({
          where: { viewerUserId: viewer.viewerId, authorUserId: { in: creatorIds } },
        })
      : Promise.resolve([]),
    getViewerEngagedTagIds(viewer.viewerId),
    db.taggable.findMany({
      where: {
        taggableType: "RESOURCE",
        taggableId: { in: resourceIds },
      },
      select: { taggableId: true, tagId: true },
    }),
  ]);

  const affinityMap = new Map<string, number>();
  for (const a of affinityRows) {
    affinityMap.set(a.authorUserId, Number(a.affinityScore));
  }

  const tagsByResourceId = new Map<string, string[]>();
  for (const rt of resourceTaggables) {
    const list = tagsByResourceId.get(rt.taggableId) ?? [];
    list.push(rt.tagId);
    tagsByResourceId.set(rt.taggableId, list);
  }

  const scored = candidates.map((resource) => {
    const hoursSinceCreated = Math.max(
      0.01,
      (now.getTime() - new Date(resource.createdAt).getTime()) / (1000 * 60 * 60),
    );
    const creatorId = resource.createdByUserId;
    const creatorCampusId = resource.creator.campusId;
    const affinity = affinityMap.get(creatorId) ?? 0.0;
    const relationshipMultiplier = computeRelationshipMultiplier(
      creatorId,
      creatorCampusId,
      viewer,
    );
    const affinityMultiplier = 1.0 + affinity * 2.0;

    const resTags = tagsByResourceId.get(resource.id) ?? [];
    let tagOverlap = 0.0;
    if (resTags.length > 0 && viewerEngagedTagIds.size > 0) {
      const matchCount = resTags.filter((tid) => viewerEngagedTagIds.has(tid)).length;
      tagOverlap = matchCount / resTags.length;
    }
    const tagMultiplier = 1.0 + tagOverlap * 0.6;

    const freshnessDecay = Math.pow(hoursSinceCreated + 2.0, 0.75);
    const score =
      (relationshipMultiplier * affinityMultiplier * tagMultiplier * 10.0) / freshnessDecay;

    return { resource, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (scored.length <= limit) {
    return scored.map((s) => s.resource);
  }

  const primary = scored.slice(0, limit - 1);
  const remaining = scored.slice(limit - 1);
  const randIdx = Math.floor(Math.random() * remaining.length);
  const exploration = remaining[randIdx]?.resource;

  const result = primary.map((s) => s.resource);
  if (exploration) {
    const insertPos = Math.min(Math.floor(limit / 2), result.length);
    result.splice(insertPos, 0, exploration);
  }
  return result.slice(0, limit);
}
