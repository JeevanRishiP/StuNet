/**
 * Posts API (Plan Delta v3)
 * POST /api/posts — create post with strict non-guest auth, targetRoles validation, anonymity, tags
 * GET  /api/posts — feed with DB-level + in-memory role & connection visibility, anonymity redaction, liked-by summary
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { getPostLikedBySummary } from "@/lib/engagement";
import { rankAndReorderCandidates, type CandidatePost } from "@/lib/feed-ranking";
import {
  ALL_TARGET_ROLES,
  buildPostAccessWhere,
  canViewerAccessPost,
  requireNonGuestUser,
  resolveViewerContext,
} from "@/lib/post-access";
import { z } from "zod";

const CreatePostSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  type: z.enum(["TEXT", "IMAGE", "LINK", "POLL"]).default("TEXT"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS", "CAMPUS"]).default("PUBLIC"),
  targetConnectionScope: z.enum(["ALL", "CONNECTED"]).default("ALL"),
  targetRoles: z
    .array(z.enum(ALL_TARGET_ROLES))
    .min(1, "Select at least one target role")
    .default([...ALL_TARGET_ROLES])
    .transform((roles) => Array.from(new Set(roles))),
  batch: z.string().trim().max(50).optional().nullable(),
  isAnonymous: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  clubId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  companyId: z.string().cuid().optional().nullable(),
  openSourceProjectId: z.string().cuid().optional().nullable(),
  linkUrl: z.string().url().max(2000).optional(),
  imageUrls: z.array(z.string().url().max(500)).max(10).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const actor = actorCheck.user;

  // Rate limit
  const rl = await rateLimit(
    `post:${actor.id}`,
    LIMITS.POST_CREATE.limit,
    LIMITS.POST_CREATE.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "You are posting too fast. Please slow down.", resetInSeconds: rl.resetInSeconds },
      { status: 429 },
    );
  }

  let rawBody: Record<string, unknown> = {};
  try {
    rawBody = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const postText = (rawBody.body ?? rawBody.content) as string | undefined;
  let postVis = rawBody.visibility as string | undefined;
  if (postVis === "CONNECTIONS_ONLY") postVis = "CONNECTIONS";
  if (postVis === "CAMPUS_ONLY") postVis = "CAMPUS";

  const parsed = CreatePostSchema.safeParse({
    ...rawBody,
    body: postText,
    visibility: postVis,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const {
    body: postBody,
    type,
    visibility,
    targetConnectionScope,
    targetRoles,
    batch,
    isAnonymous,
    tags,
    clubId,
    groupId,
    companyId,
    openSourceProjectId,
    linkUrl,
    imageUrls,
  } = parsed.data;

  if (!postBody && !linkUrl && (!imageUrls || imageUrls.length === 0)) {
    return NextResponse.json({ error: "Post must have content" }, { status: 422 });
  }

  // Validate company posting permissions: only FOUNDER or CO_FOUNDER
  if (companyId) {
    const role = await db.userCompanyRole.findUnique({
      where: {
        userId_companyId: {
          userId: actor.id,
          companyId,
        },
      },
    });
    const isAdmin = actor.role === "SUPER_ADMIN";
    if ((!role || (role.ownerType !== "FOUNDER" && role.ownerType !== "CO_FOUNDER")) && !isAdmin) {
      return NextResponse.json(
        { error: "Only the founder or co-founders can post on behalf of this company." },
        { status: 403 },
      );
    }
  }

  // Validate open source project posting permissions: only maintainer / owner
  if (openSourceProjectId) {
    const project = await db.openSourceProject.findUnique({
      where: { id: openSourceProjectId },
      include: {
        members: { where: { userId: actor.id } },
      },
    });
    const isMaintainer =
      project?.ownerUserId === actor.id || project?.members.some((m) => m.role === "MAINTAINER");
    const isAdmin = actor.role === "SUPER_ADMIN";
    if (!isMaintainer && !isAdmin) {
      return NextResponse.json(
        { error: "Only project maintainers can post on behalf of this open source project." },
        { status: 403 },
      );
    }
  }

  const post = await db.post.create({
    data: {
      authorId: actor.id,
      type,
      visibility,
      targetConnectionScope,
      targetRoles,
      batch: batch || (actor.joiningYear ? String(actor.joiningYear) : null),
      isAnonymous,
      clubId,
      groupId,
      companyId: companyId || null,
      openSourceProjectId: openSourceProjectId || null,
      body: postBody,
      linkUrl,
      imageUrls: imageUrls ?? [],
    },
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
          tagline: true,
          isRevenueVerified: true,
        },
      },
      openSourceProject: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          primaryLanguage: true,
          tagline: true,
          starsCount: true,
        },
      },
    },
  });

  // Handle tags if provided
  if (tags && tags.length > 0) {
    for (const tagLabel of tags) {
      const cleanLabel = tagLabel.toLowerCase().trim().replace(/^#/, "");
      if (!cleanLabel) continue;

      const tagRecord = await db.tag.upsert({
        where: { label: cleanLabel },
        create: { label: cleanLabel },
        update: {},
      });

      await db.taggable.upsert({
        where: {
          tagId_taggableType_taggableId: {
            tagId: tagRecord.id,
            taggableType: "POST",
            taggableId: post.id,
          },
        },
        create: {
          tagId: tagRecord.id,
          taggableType: "POST",
          taggableId: post.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json(
    {
      ...post,
      content: post.body,
      _count: { comments: 0 },
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      likedBySummary: "",
      viewerHasLiked: false,
    },
    { status: 201 },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const tab = url.searchParams.get("tab")?.toUpperCase(); // ALL | STUDENTS | FACULTY | ALUMNI | CONNECTED | FOLLOWING
  const subFilter = url.searchParams.get("subFilter")?.toUpperCase(); // ALL | FOLLOWING | CONNECTED
  const tag = url.searchParams.get("tag")?.toLowerCase().trim();
  const batch = url.searchParams.get("batch")?.trim();

  const initiativesOnly = url.searchParams.get("initiativesOnly") === "true";
  const initiativeType = url.searchParams.get("initiativeType")?.toUpperCase() as
    "ALL" | "COMPANY" | "PROJECT" | undefined;
  const companyId = url.searchParams.get("companyId") || undefined;
  const openSourceProjectId = url.searchParams.get("openSourceProjectId") || undefined;

  // Tag filter if specified
  let taggedPostIds: string[] | undefined = undefined;
  if (tag) {
    const tagMatches = await db.taggable.findMany({
      where: {
        taggableType: "POST",
        tag: { label: tag },
      },
      select: { taggableId: true },
    });
    taggedPostIds = tagMatches.map((t) => t.taggableId);
    if (taggedPostIds.length === 0) {
      return NextResponse.json({ items: [], posts: [], nextCursor: null, hasMore: false });
    }
  }

  // Push strict targetRoles, connection scope, visibility, and block filtering directly into Postgres
  const whereClause = buildPostAccessWhere(viewer, {
    tab,
    subFilter,
    taggedPostIds,
    batch,
    cursor,
    initiativesOnly,
    initiativeType,
    companyId,
    openSourceProjectId,
  });

  // Stage 1 Candidates: cheap, broad, SQL only with visibility constraints (Section 2)
  const candidateTake = cursor ? limit + 1 : Math.max(limit * 3, 50);

  const posts = await db.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: candidateTake,
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          headline: true,
          role: true,
          verificationStatus: true,
          campusId: true,
          campus: { select: { slug: true, name: true } },
          joiningYear: true,
          section: true,
          studentAcademicDetails: {
            select: {
              joinedYear: true,
              currentCourseYear: true,
            },
          },
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
          tagline: true,
          isRevenueVerified: true,
        },
      },
      openSourceProject: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          primaryLanguage: true,
          tagline: true,
          starsCount: true,
        },
      },
      _count: { select: { comments: true } },
    },
  });

  // Defense-in-depth second verification in memory (ALWAYS strictly before scoring)
  const verifiedPosts = posts.filter((post) => canViewerAccessPost(viewer, post));

  // Stage 3 Hybrid Scoring & Exploration Re-ranking (Sections 2, 6, & 7)
  const overrideVariant = (
    url.searchParams.get("rankingVariant") ?? req.headers.get("x-feed-ranking-variant")
  )?.toUpperCase() as "CONTROL" | "HYBRID_V2" | undefined;

  const { rankedPosts, scoredItems, assignedVariant, modelWeight, modelVersionId } =
    await rankAndReorderCandidates(verifiedPosts as unknown as CandidatePost[], viewer, limit, {
      variant: overrideVariant,
    });

  const explorationMap = new Map<string, boolean>();
  for (const s of scoredItems) {
    explorationMap.set(s.post.id, s.isExploration);
  }

  const hasMore = verifiedPosts.length > limit;
  const sliced = rankedPosts;

  // Process Instagram-style liked-by display and Anonymity rules
  const items = await Promise.all(
    sliced.map(async (p) => {
      const summary = await getPostLikedBySummary(
        p.id,
        p.likeCount,
        viewer.viewerId ?? undefined,
        viewer.campusId ?? undefined,
      );

      const isConnected = viewer.viewerId ? viewer.connectedUserIds.has(p.authorId) : false;
      const isFollowing = viewer.viewerId ? viewer.followedUserIds.has(p.authorId) : false;
      const isAlumni = p.author.role === "ALUMNI";
      const isFaculty = p.author.role === "FACULTY";

      if (p.isAnonymous) {
        const roleLabel =
          p.author.role === "FACULTY"
            ? "Faculty"
            : p.author.role === "ALUMNI"
              ? "Alumni"
              : "Student";

        return {
          id: p.id,
          content: p.body,
          body: p.body,
          type: p.type,
          visibility: p.visibility,
          targetConnectionScope: p.targetConnectionScope,
          targetRoles: p.targetRoles,
          batch: p.batch || (p.author?.joiningYear ? String(p.author.joiningYear) : null),
          isAnonymous: true,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          viewCount: p.viewCount,
          createdAt: p.createdAt,
          authorId: null, // redacted for client
          author: {
            id: "anonymous",
            displayName: roleLabel,
            username: "anonymous",
            avatarUrl: null,
            headline: null,
            role: p.author.role,
            verificationStatus: p.author.verificationStatus,
            campus: p.author.campus,
          },
          _count: { comments: p.commentCount },
          isConnection: false,
          isFollowing: false,
          isAlumni,
          isFaculty,
          likedBySummary: summary.displayString,
          viewerHasLiked: summary.viewerHasLiked,
        };
      }

      return {
        ...p,
        batch: p.batch || (p.author?.joiningYear ? String(p.author.joiningYear) : null),
        content: p.body,
        _count: { comments: p.commentCount },
        isConnection: isConnected,
        isFollowing,
        isAlumni,
        isFaculty,
        likedBySummary: summary.displayString,
        viewerHasLiked: summary.viewerHasLiked,
      };
    }),
  );

  const nextCursor = hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null;

  // Feed Ranking System v2 (Stage 4 & 7): Log impressions with variant and exploration flag
  const sessionId =
    req.headers.get("x-feed-session-id") ??
    url.searchParams.get("sessionId") ??
    crypto.randomUUID();

  if (viewer.viewerId && items.length > 0) {
    try {
      const currentViewerId = viewer.viewerId;
      const rankOffset = Math.max(0, parseInt(url.searchParams.get("rankOffset") ?? "0", 10) || 0);
      await db.feedImpression.createMany({
        data: items.map((item, idx) => ({
          userId: currentViewerId,
          postId: item.id,
          rankPosition: rankOffset + idx,
          sessionId,
          variant: assignedVariant,
          isExploration: explorationMap.get(item.id) ?? false,
          shownAt: new Date(),
        })),
      });
    } catch (logErr) {
      console.error("[FeedImpression] Failed to record feed impressions:", logErr);
    }
  }

  return NextResponse.json({
    items,
    posts: items,
    nextCursor,
    hasMore,
    sessionId,
    ranking: {
      variant: assignedVariant,
      modelWeight,
      modelVersionId,
    },
  });
}
