/**
 * /api/posts/[id]/comments
 * GET  — fetch post comments with 1-level replies
 * POST — post a new comment or reply
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const AddCommentSchema = z.object({
  content: z.string().min(1).max(2000).trim(),
  parentCommentId: z.string().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const postId = params.id;

  const comments = await db.postComment.findMany({
    where: {
      postId,
      parentCommentId: null, // top-level comments
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
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = params.id;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
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

  // If replying to a comment, ensure parent exists and is top-level (1 level replies supported per spec)
  let validParentId: string | null = null;
  if (parentCommentId) {
    const parent = await db.postComment.findUnique({
      where: { id: parentCommentId },
      select: { id: true, parentCommentId: true },
    });
    if (parent) {
      // If parent is already a reply, flatten to the root comment
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
