/**
 * /api/users/me/activity/comments/[id]
 *
 * Allows authenticated user to edit or delete their own comment.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const EditCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000).trim(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const commentId = params.id;

  try {
    const comment = await db.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized to edit this comment" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = EditCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid content" },
        { status: 422 },
      );
    }

    const updated = await db.postComment.update({
      where: { id: commentId },
      data: { content: parsed.data.content },
    });

    return NextResponse.json({ success: true, comment: updated });
  } catch (err) {
    console.error("PATCH /api/users/me/activity/comments error:", err);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const commentId = params.id;

  try {
    const comment = await db.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized to delete this comment" }, { status: 403 });
    }

    // Delete comment and decrement post commentCount
    await db.$transaction([
      db.postComment.delete({
        where: { id: commentId },
      }),
      db.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Comment deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/users/me/activity/comments error:", err);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}
