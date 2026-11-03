/**
 * Posts API
 * POST /api/posts — create a post (rate-limited)
 * GET  /api/posts — home feed (respects blocks, visibility)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const CreatePostSchema = z.object({
  body: z.string().min(1).max(5000).optional(),
  type: z.enum(["TEXT", "IMAGE", "LINK", "POLL"]).default("TEXT"),
  visibility: z.enum(["PUBLIC", "CONNECTIONS", "CAMPUS"]).default("PUBLIC"),
  clubId: z.string().cuid().optional(),
  groupId: z.string().cuid().optional(),
  linkUrl: z.string().url().max(2000).optional(),
  imageUrls: z.array(z.string().url().max(500)).max(10).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only verified students can post
  if (session.user.verificationStatus !== "VERIFIED") {
    return NextResponse.json({ error: "Account pending verification" }, { status: 403 });
  }

  // Rate limit: 10 posts per minute
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

  const { body: postBody, type, visibility, clubId, groupId, linkUrl, imageUrls } = parsed.data;

  if (!postBody && !linkUrl && (!imageUrls || imageUrls.length === 0)) {
    return NextResponse.json({ error: "Post must have content" }, { status: 422 });
  }

  const post = await db.post.create({
    data: {
      authorId: session.user.id,
      type,
      visibility,
      clubId,
      groupId,
      body: postBody,
      linkUrl,
      imageUrls: imageUrls ?? [],
    },
    include: {
      author: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json(
    { ...post, content: post.body, _count: { comments: 0 } },
    { status: 201 },
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  // Get IDs of users this viewer has blocked or is blocked by
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

  // Determine which visibility levels to include
  const visibilityFilter = viewerId
    ? session?.user?.verificationStatus === "VERIFIED"
      ? ["PUBLIC", "CONNECTIONS", "CAMPUS"]
      : ["PUBLIC"]
    : ["PUBLIC"];

  const posts = await db.post.findMany({
    where: {
      deletedAt: null,
      isHidden: false,
      visibility: { in: visibilityFilter as ("PUBLIC" | "CONNECTIONS" | "CAMPUS")[] },
      authorId: { notIn: blockedIds },
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          headline: true,
          verificationStatus: true,
          campus: { select: { slug: true, name: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  const hasMore = posts.length > limit;
  const rawItems = hasMore ? posts.slice(0, limit) : posts;
  const items = rawItems.map((p) => ({
    ...p,
    content: p.body,
  }));
  const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : null;

  return NextResponse.json({ items, posts: items, nextCursor, hasMore });
}
