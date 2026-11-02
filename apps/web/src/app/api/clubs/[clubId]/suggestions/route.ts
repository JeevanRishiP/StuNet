/**
 * Suggestion windows API — Student Portal
 * GET  /api/clubs/[clubId]/suggestions — list open windows + suggestions
 * POST /api/clubs/[clubId]/suggestions — submit a suggestion (members only)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

interface Params {
  params: { clubId: string };
}

const SuggestionSchema = z.object({
  windowId: z.string().cuid(),
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(5000),
});

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const windows = await db.suggestionWindow.findMany({
    where: {
      clubId: params.clubId,
      isActive: true,
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
    include: {
      suggestions: {
        orderBy: { voteCount: "desc" },
        select: {
          id: true,
          title: true,
          body: true,
          voteCount: true,
          isImplemented: true,
          createdAt: true,
          // Author ID only — never display name to preserve pseudonymity
          authorId: true,
        },
      },
    },
    orderBy: { opensAt: "asc" },
  });

  return NextResponse.json({ windows });
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify club membership
  const membership = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: params.clubId, userId: session.user.id } },
    select: { isActive: true },
  });
  if (!membership?.isActive) {
    return NextResponse.json(
      { error: "Must be a club member to submit suggestions" },
      { status: 403 },
    );
  }

  const rl = await rateLimit(`suggest:${session.user.id}`, 5, 60 * 60_000); // 5/hr
  if (!rl.success) {
    return NextResponse.json({ error: "Too many suggestions — please slow down" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { windowId, title, body: suggestionBody } = parsed.data;

  // Verify the window is open and belongs to this club
  const now = new Date();
  const window = await db.suggestionWindow.findFirst({
    where: {
      id: windowId,
      clubId: params.clubId,
      isActive: true,
      opensAt: { lte: now },
      closesAt: { gte: now },
    },
  });
  if (!window) {
    return NextResponse.json({ error: "Suggestion window not found or not open" }, { status: 404 });
  }

  const suggestion = await db.suggestion.create({
    data: {
      windowId,
      authorId: session.user.id,
      title,
      body: suggestionBody,
    },
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json(suggestion, { status: 201 });
}
