/**
 * POST /api/posts/[id]/view
 * Records a view event for a post by the current verified/non-guest user.
 * Enforces strict post visibility and targetRoles access check before recording or revealing count.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canViewerAccessPost, resolveViewerContext } from "@/lib/post-access";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);
  if (viewer.isGuest || !viewer.viewerId) {
    return NextResponse.json({ ok: false, error: "Guest views unrecorded" }, { status: 200 });
  }

  const userId = viewer.viewerId;
  const postId = params.id;

  try {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        viewCount: true,
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
      return NextResponse.json({ ok: false, error: "Post not found" }, { status: 404 });
    }

    const existingView = await db.postView.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingView) {
      await db.postView.update({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
        data: {
          lastViewedAt: new Date(),
          viewCount: { increment: 1 },
        },
      });
    } else {
      await db.postView.create({
        data: {
          postId,
          userId,
          firstViewedAt: new Date(),
          lastViewedAt: new Date(),
          viewCount: 1,
        },
      });
    }

    const updated = await db.post.findUnique({
      where: { id: postId },
      select: { viewCount: true },
    });

    return NextResponse.json({ ok: true, viewCount: updated?.viewCount ?? 1 });
  } catch (_err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
