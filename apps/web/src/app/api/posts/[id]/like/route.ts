/**
 * POST /api/posts/[id]/like
 * Toggles like on a post.
 * Enforces non-guest auth and strict post visibility/targetRoles access check.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPostLikedBySummary } from "@/lib/engagement";
import { canViewerAccessPost, requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";

export async function POST(
  _req: NextRequest,
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

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      likeCount: true,
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

  if (!post || !canViewerAccessPost(viewer, post)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existingLike = await db.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId,
      },
    },
  });

  let liked = false;
  if (existingLike) {
    await db.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });
    liked = false;
  } else {
    await db.postLike.create({
      data: {
        postId,
        userId,
      },
    });
    liked = true;
  }

  const updatedPost = await db.post.findUnique({
    where: { id: postId },
    select: { likeCount: true },
  });

  const currentCount = updatedPost?.likeCount ?? 0;

  const summary = await getPostLikedBySummary(
    postId,
    currentCount,
    userId,
    viewer.campusId ?? undefined,
  );

  return NextResponse.json({
    liked,
    likeCount: currentCount,
    likedBySummary: summary.displayString,
    featuredName: summary.featuredName,
  });
}
