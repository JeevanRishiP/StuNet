/**
 * Posts API (Plan Delta v3)
 * POST /api/posts — create post with targeting, anonymity, tags
 * GET  /api/posts — feed with role & connection visibility, anonymity redaction, Instagram-style liked-by summary
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { getPostLikedBySummary } from "@/lib/engagement";
import { z } from "zod";

const CreatePostSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  type: z.enum(["TEXT", "IMAGE", "LINK", "POLL"]).default("TEXT"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS", "CAMPUS"]).default("PUBLIC"),
  targetConnectionScope: z.enum(["ALL", "CONNECTED"]).default("ALL"),
  targetRoles: z.array(z.string()).default(["STUDENT", "FACULTY", "ALUMNI"]),
  isAnonymous: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  clubId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  linkUrl: z.string().url().max(2000).optional(),
  imageUrls: z.array(z.string().url().max(500)).max(10).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit
  const rl = await rateLimit(
    `post:${session.user.id}`,
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
    isAnonymous,
    tags,
    clubId,
    groupId,
    linkUrl,
    imageUrls,
  } = parsed.data;

  if (!postBody && !linkUrl && (!imageUrls || imageUrls.length === 0)) {
    return NextResponse.json({ error: "Post must have content" }, { status: 422 });
  }

  const post = await db.post.create({
    data: {
      authorId: session.user.id,
      type,
      visibility,
      targetConnectionScope,
      targetRoles,
      isAnonymous,
      clubId,
      groupId,
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
  const viewerId = session?.user?.id;
  const viewerRole = session?.user?.role ?? "GUEST";
  const viewerCampusId = session?.user?.campusId;

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const tab = url.searchParams.get("tab")?.toUpperCase(); // ALL | STUDENTS | FACULTY | ALUMNI | CONNECTED
  const tag = url.searchParams.get("tag")?.toLowerCase().trim();

  // Get blocked users
  let blockedIds: string[] = [];
  if (viewerId) {
    const blocks = await db.userBlock.findMany({
      where: {
        OR: [{ initiatorId: viewerId }, { targetId: viewerId }],
      },
      select: { initiatorId: true, targetId: true },
    });
    blockedIds = blocks.flatMap((b) =>
      b.initiatorId === viewerId ? [b.targetId] : [b.initiatorId],
    );
  }

  // Get accepted connections
  const connectedUserIds = new Set<string>();
  if (viewerId) {
    const connections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: viewerId }, { receiverId: viewerId }],
      },
      select: { senderId: true, receiverId: true },
    });
    connections.forEach((c) => {
      connectedUserIds.add(c.senderId === viewerId ? c.receiverId : c.senderId);
    });
  }

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
  }

  // Visibility levels
  const visibilityFilter = viewerId
    ? session?.user?.verificationStatus === "VERIFIED"
      ? ["PUBLIC", "CONNECTIONS", "CAMPUS"]
      : ["PUBLIC"]
    : ["PUBLIC"];

  // Fetch candidate posts
  const posts = await db.post.findMany({
    where: {
      deletedAt: null,
      isHidden: false,
      visibility: { in: visibilityFilter as ("PUBLIC" | "CONNECTIONS" | "CAMPUS")[] },
      authorId: { notIn: blockedIds },
      ...(taggedPostIds ? { id: { in: taggedPostIds } } : {}),
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2, // overfetch to apply stream & visibility checks accurately
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
        },
      },
      _count: { select: { comments: true } },
    },
  });

  // Filter posts by target_roles, target_connection_scope, and tab
  const filtered = posts.filter((post) => {
    // 1. target_roles: viewer's role must be eligible
    if (post.targetRoles && post.targetRoles.length > 0) {
      if (viewerId && !post.targetRoles.includes(viewerRole)) {
        return false;
      }
    }

    // 2. target_connection_scope: if CONNECTED, viewer must be connected to author (or be author)
    if (post.targetConnectionScope === "CONNECTED") {
      if (!viewerId) return false;
      if (post.authorId !== viewerId && !connectedUserIds.has(post.authorId)) {
        return false;
      }
    }

    // 3. Tab filter
    if (tab === "STUDENTS" && post.author.role !== "STUDENT") return false;
    if (tab === "FACULTY" && post.author.role !== "FACULTY") return false;
    if (tab === "ALUMNI" && post.author.role !== "ALUMNI") return false;
    if (tab === "CONNECTED") {
      if (!viewerId) return false;
      if (post.authorId !== viewerId && !connectedUserIds.has(post.authorId)) return false;
    }

    return true;
  });

  const sliced = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  // Process Instagram-style liked-by display and Anonymity rules
  const items = await Promise.all(
    sliced.map(async (p) => {
      const summary = await getPostLikedBySummary(p.id, p.likeCount, viewerId, viewerCampusId);

      const isConnected = viewerId ? connectedUserIds.has(p.authorId) : false;
      const isAlumni = p.author.role === "ALUMNI";
      const isFaculty = p.author.role === "FACULTY";

      // Anonymity rule:
      // "when is_anonymous = true, every read path must render the author as their role label only
      // ('Student', 'Faculty', or 'Alumni') and must never expose author_user_id to the client"
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
          isAlumni,
          isFaculty,
          likedBySummary: summary.displayString,
          viewerHasLiked: summary.viewerHasLiked,
        };
      }

      return {
        ...p,
        content: p.body,
        _count: { comments: p.commentCount },
        isConnection: isConnected,
        isAlumni,
        isFaculty,
        likedBySummary: summary.displayString,
        viewerHasLiked: summary.viewerHasLiked,
      };
    }),
  );

  const nextCursor = hasMore ? items[items.length - 1]?.createdAt?.toISOString() : null;

  return NextResponse.json({ items, posts: items, nextCursor, hasMore });
}
