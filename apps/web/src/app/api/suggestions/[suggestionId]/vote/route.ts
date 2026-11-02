/**
 * Suggestion vote API — Student Portal
 * POST   /api/suggestions/[suggestionId]/vote — cast/change vote (one per window)
 * DELETE /api/suggestions/[suggestionId]/vote — retract vote
 *
 * The DB unique constraint on (windowId, voterId) enforces one changeable vote per window.
 * We upsert the vote row (updating suggestionId) + recalculate voteCount atomically.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

interface Params {
  params: { suggestionId: string };
}

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(
    `vote:${session.user.id}`,
    LIMITS.POLL_VOTE.limit,
    LIMITS.POLL_VOTE.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Too many votes — please slow down" }, { status: 429 });
  }

  // Fetch suggestion + its window
  const suggestion = await db.suggestion.findUnique({
    where: { id: params.suggestionId },
    include: {
      window: {
        select: {
          id: true,
          clubId: true,
          isActive: true,
          opensAt: true,
          closesAt: true,
        },
      },
    },
  });

  if (!suggestion) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  const now = new Date();
  const w = suggestion.window;
  if (!w.isActive || w.opensAt > now || w.closesAt < now) {
    return NextResponse.json({ error: "Suggestion window is not open" }, { status: 409 });
  }

  // Verify user is a member of the club
  const membership = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: w.clubId, userId: session.user.id } },
    select: { isActive: true },
  });
  if (!membership?.isActive) {
    return NextResponse.json({ error: "Must be a club member to vote" }, { status: 403 });
  }

  // Find any existing vote in this window
  const existingVote = await db.suggestionVote.findUnique({
    where: { windowId_voterId: { windowId: w.id, voterId: session.user.id } },
  });

  await db.$transaction(async (tx) => {
    if (existingVote) {
      if (existingVote.suggestionId === params.suggestionId) {
        // Already voted for this suggestion — no-op
        return;
      }
      // Changing vote — decrement old, update row, increment new
      await tx.suggestion.update({
        where: { id: existingVote.suggestionId },
        data: { voteCount: { decrement: 1 } },
      });
      await tx.suggestionVote.update({
        where: { id: existingVote.id },
        data: { suggestionId: params.suggestionId },
      });
    } else {
      // New vote
      await tx.suggestionVote.create({
        data: {
          suggestionId: params.suggestionId,
          windowId: w.id,
          voterId: session.user.id,
        },
      });
    }
    await tx.suggestion.update({
      where: { id: params.suggestionId },
      data: { voteCount: { increment: 1 } },
    });
  });

  return NextResponse.json({ voted: true });
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestion = await db.suggestion.findUnique({
    where: { id: params.suggestionId },
    select: { window: { select: { id: true } } },
  });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const vote = await db.suggestionVote.findUnique({
    where: {
      windowId_voterId: { windowId: suggestion.window.id, voterId: session.user.id },
    },
  });
  if (!vote || vote.suggestionId !== params.suggestionId) {
    return NextResponse.json({ error: "No vote to retract" }, { status: 404 });
  }

  await db.$transaction([
    db.suggestionVote.delete({ where: { id: vote.id } }),
    db.suggestion.update({
      where: { id: params.suggestionId },
      data: { voteCount: { decrement: 1 } },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}
