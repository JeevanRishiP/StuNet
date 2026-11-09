/**
 * /api/invites
 * Professional Invites (Connections-only team-up requests)
 * Plan Delta v3: Visible ONLY to creator's accepted connections.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfessionalInviteSchema } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    return NextResponse.json({ items: [] });
  }

  // Get viewer's accepted connections
  const connections = await db.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: viewerId }, { receiverId: viewerId }],
    },
    select: { senderId: true, receiverId: true },
  });

  const allowedCreatorIds = [
    viewerId,
    ...connections.map((c) => (c.senderId === viewerId ? c.receiverId : c.senderId)),
  ];

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get("limit") ?? "20", 10), 50);

  const invites = await db.professionalInvite.findMany({
    where: {
      creatorUserId: { in: allowedCreatorIds },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          campus: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json({ items: invites });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ProfessionalInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid invite data" },
      { status: 422 },
    );
  }

  const {
    name,
    description,
    mode,
    type,
    requirements,
    eventDate,
    registrationDeadline,
    location,
    expiresAt,
  } = parsed.data;

  const invite = await db.professionalInvite.create({
    data: {
      creatorUserId: userId,
      name,
      description,
      mode,
      type,
      requirements,
      eventDate,
      registrationDeadline,
      location,
      expiresAt,
    },
    include: {
      creator: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json(invite, { status: 201 });
}
