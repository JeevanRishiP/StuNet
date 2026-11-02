/**
 * Connections API
 * POST   /api/connections          — send request
 * GET    /api/connections          — list my connections
 * PATCH  /api/connections/[id]     — accept / decline
 * DELETE /api/connections/[id]     — remove connection
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const SendConnectionSchema = z.object({
  receiverId: z.string().cuid(),
  message: z.string().max(300).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 20 connection requests per hour
  const rl = await rateLimit(
    `conn:${session.user.id}`,
    LIMITS.CONNECTION_REQUEST.limit,
    LIMITS.CONNECTION_REQUEST.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many connection requests. Please slow down." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendConnectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

  const { receiverId, message } = parsed.data;
  const senderId = session.user.id;

  if (receiverId === senderId) {
    return NextResponse.json({ error: "Cannot connect with yourself" }, { status: 400 });
  }

  // Block check — blocked users cannot send requests
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { initiatorId: senderId, targetId: receiverId },
        { initiatorId: receiverId, targetId: senderId },
      ],
    },
  });
  if (block) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if connection already exists
  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Connection already exists" }, { status: 409 });
  }

  const connection = await db.connection.create({
    data: { senderId, receiverId, message },
  });

  return NextResponse.json(connection, { status: 201 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "ACCEPTED";

  const connections = await db.connection.findMany({
    where: {
      OR: [
        { senderId: session.user.id, status: status as "ACCEPTED" | "PENDING" | "DECLINED" },
        { receiverId: session.user.id, status: status as "ACCEPTED" | "PENDING" | "DECLINED" },
      ],
    },
    include: {
      sender: {
        select: { id: true, displayName: true, username: true, avatarUrl: true, headline: true },
      },
      receiver: {
        select: { id: true, displayName: true, username: true, avatarUrl: true, headline: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Return the "other person" in each connection
  const mapped = connections.map((c) => ({
    id: c.id,
    status: c.status,
    createdAt: c.createdAt,
    person: c.senderId === session.user.id ? c.receiver : c.sender,
    direction: c.senderId === session.user.id ? "sent" : "received",
  }));

  return NextResponse.json(mapped);
}
