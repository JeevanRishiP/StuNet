/**
 * POST /api/posts/[id]/view
 * Records a view event for a post by the current user.
 * Increments view_count on repeat views.
 * DB triggers maintain view_count on the posts table.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Anonymous views unrecorded" }, { status: 200 });
  }

  const postId = params.id;

  try {
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

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { viewCount: true },
    });

    return NextResponse.json({ ok: true, viewCount: post?.viewCount ?? 1 });
  } catch (_err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
