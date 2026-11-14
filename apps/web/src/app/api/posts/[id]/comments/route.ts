/**
 * /api/posts/[id]/comments
 * GET  — fetch post comments with 1-level replies (strict post access & block checks)
 * POST — post a new comment or reply (strict non-guest + post access checks)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { canViewerAccessPost, requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { z } from "zod";

const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  parentCommentId: z.string().optional().nullable(),
});

async function getAccessiblePost(postId: string) {
  return db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      visibility: true,
      targetConnectionScope: true,
      targetRoles: true,
      isAnonymous: true,
      isHidden: true,
      deletedAt: true,
      author: { select: { campusId: true } },
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);
  const postId = params.id;

  const post = await getAccessiblePost(postId);
  if (!post || !canViewerAccessPost(viewer, post)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comments = await db.postComment.findMany({
    where: {
      postId,
      parentCommentId: null, // top-level comments
      ...(viewer.blockedIds.length > 0 ? { userId: { notIn: viewer.blockedIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          verificationStatus: true,
        },
      },
      replies: {
        where: viewer.blockedIds.length > 0 ? { userId: { notIn: viewer.blockedIds } } : undefined,
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
              verificationStatus: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ items: comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const userId = actorCheck.user.id;
  const viewer = await resolveViewerContext(session);

  const postId = params.id;
  const post = await getAccessiblePost(postId);

  if (!post || !canViewerAccessPost(viewer, post)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Rate limit
  const rl = await rateLimit(
    `comment:${userId}`,
    LIMITS.COMMENT_CREATE.limit,
    LIMITS.COMMENT_CREATE.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Commenting too quickly. Please wait.", resetInSeconds: rl.resetInSeconds },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AddCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid comment" },
      { status: 422 },
    );
  }

  const { content, parentCommentId } = parsed.data;

  // If replying to a comment, ensure parent exists within the SAME post
  let validParentId: string | null = null;
  if (parentCommentId) {
    const parent = await db.postComment.findUnique({
      where: { id: parentCommentId },
      select: { id: true, postId: true, parentCommentId: true },
    });
    if (parent && parent.postId === postId) {
      validParentId = parent.parentCommentId ?? parent.id;
    }
  }

  const comment = await db.postComment.create({
    data: {
      postId,
      userId,
      content,
      parentCommentId: validParentId,
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          verificationStatus: true,
        },
      },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
