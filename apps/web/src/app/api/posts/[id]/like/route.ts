/**
 * POST /api/posts/[id]/like
 * Toggles like on a post.
 * Triggers on `post_likes` maintain `like_count` on `posts`.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPostLikedBySummary } from "@/lib/engagement";

export async function POST(
  _req: NextRequest,
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
    select: { id: true, likeCount: true },
  });

  if (!post) {
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
    // Unlike
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
    // Like
    await db.postLike.create({
      data: {
        postId,
        userId,
      },
    });
    liked = true;
  }

  // Refetch updated post counter
  const updatedPost = await db.post.findUnique({
    where: { id: postId },
    select: { likeCount: true },
  });

  const currentCount = updatedPost?.likeCount ?? 0;

  const summary = await getPostLikedBySummary(postId, currentCount, userId, session.user.campusId);

  return NextResponse.json({
    liked,
    likeCount: currentCount,
    likedBySummary: summary.displayString,
    featuredName: summary.featuredName,
  });
}
