/**
 * /api/polls/[id]
 *
 * GET, PATCH, DELETE for a single poll.
 * Author or Admin only for mutations.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdatePollSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters").max(500).trim(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const poll = await db.poll.findUnique({
    where: { id: params.id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      post: {
        select: {
          id: true,
          authorId: true,
          deletedAt: true,
          author: {
            select: {
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!poll || poll.deletedAt) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  return NextResponse.json({ poll });
}

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
  const pollId = params.id;

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { id: true, postId: true, deletedAt: true, post: { select: { authorId: true } } },
  });

  if (!poll || poll.deletedAt) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const isAuthor = poll.post.authorId === userId;
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "CAMPUS_MANAGER";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized to edit this poll" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = UpdatePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid question" },
      { status: 422 },
    );
  }

  const updated = await db.poll.update({
    where: { id: pollId },
    data: { question: parsed.data.question },
  });

  return NextResponse.json({ success: true, poll: updated });
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
  const pollId = params.id;

  const poll = await db.poll.findUnique({
    where: { id: pollId },
    select: { id: true, postId: true, deletedAt: true, post: { select: { authorId: true } } },
  });

  if (!poll || poll.deletedAt) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const isAuthor = poll.post.authorId === userId;
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "CAMPUS_MANAGER";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized to delete this poll" }, { status: 403 });
  }

  const now = new Date();
  await db.$transaction([
    db.poll.update({
      where: { id: pollId },
      data: { deletedAt: now },
    }),
    db.post.update({
      where: { id: poll.postId },
      data: { deletedAt: now },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Poll deleted successfully" });
}
