/**
 * Block API
 * POST   /api/blocks        — block a user
 * DELETE /api/blocks/[id]   — unblock
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const BlockSchema = z.object({
  targetId: z.string().cuid(),
  reason: z.string().max(300).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const initiatorId = actorCheck.user.id;

  const limited = await rateLimit(`block:${initiatorId}`, 20, 3600);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BlockSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const { targetId, reason } = parsed.data;

  if (targetId === initiatorId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  // Upsert (idempotent)
  const block = await db.userBlock.upsert({
    where: { initiatorId_targetId: { initiatorId, targetId } },
    update: {},
    create: { initiatorId, targetId, reason },
  });

  // Also remove any existing connection between them
  await db.connection.deleteMany({
    where: {
      OR: [
        { senderId: initiatorId, receiverId: targetId },
        { senderId: targetId, receiverId: initiatorId },
      ],
    },
  });

  return NextResponse.json({ id: block.id }, { status: 201 });
}
