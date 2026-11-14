/**
 * /api/invites
 * Professional Invites (Connections-only team-up requests)
 * Plan Delta v3: Visible ONLY to creator's accepted connections.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfessionalInviteSchema } from "@stunet/types";
import { requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { rankInviteCandidates } from "@/lib/feed-ranking";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);
  if (viewer.isGuest || !viewer.viewerId) {
    return NextResponse.json({ items: [] });
  }
  const viewerId = viewer.viewerId;

  // Get viewer's accepted connections
  const connections = await db.connection.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: viewerId }, { receiverId: viewerId }],
    },
    select: { senderId: true, receiverId: true },
  });

  const connectedIds = connections.map((c) =>
    c.senderId === viewerId ? c.receiverId : c.senderId,
  );
  const allowedCreatorIds = [viewerId, ...connectedIds];

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "relevant";
  const nonConnectedOnly = url.searchParams.get("nonConnectedOnly") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const candidateTake = sort === "recent" ? limit : Math.max(limit * 3, 40);

  const whereCondition: Prisma.ProfessionalInviteWhereInput = {
    AND: [
      {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      nonConnectedOnly
        ? {
            recipientUserId: viewerId,
            creatorUserId: { notIn: allowedCreatorIds },
          }
        : {
            OR: [
              { recipientUserId: viewerId },
              { creatorUserId: { in: allowedCreatorIds }, recipientUserId: null },
            ],
          },
    ],
  };

  const invites = await db.professionalInvite.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    take: candidateTake,
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          campusId: true,
          campus: { select: { id: true, name: true, slug: true } },
        },
      },
      recipient: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  const rankedInvites = await rankInviteCandidates(invites, viewer, limit, { sort });
  const mappedInvites = rankedInvites.map((inv) => {
    const isFromNonConnected =
      inv.creatorUserId !== viewerId && !connectedIds.includes(inv.creatorUserId);
    return {
      ...inv,
      isFromNonConnected,
      isDirectInvite: Boolean(inv.isDirectInvite || inv.recipientUserId === viewerId),
    };
  });

  return NextResponse.json({ items: mappedInvites });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const userId = actorCheck.user.id;

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
    recipientUserId,
    isDirectInvite,
    tags,
  } = parsed.data;

  const invite = await db.professionalInvite.create({
    data: {
      creatorUserId: userId,
      recipientUserId: recipientUserId || null,
      isDirectInvite: Boolean(isDirectInvite || recipientUserId),
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
      recipient: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  // Handle tags if provided
  if (tags && tags.length > 0) {
    for (const tagLabel of tags) {
      const cleanLabel = tagLabel.toLowerCase().trim().replace(/^#/, "");
      if (!cleanLabel) continue;

      const tagRecord = await db.tag.upsert({
        where: { label: cleanLabel },
        create: { label: cleanLabel },
        update: {},
      });

      await db.taggable.upsert({
        where: {
          tagId_taggableType_taggableId: {
            tagId: tagRecord.id,
            taggableType: "PROJECT",
            taggableId: invite.id,
          },
        },
        create: {
          tagId: tagRecord.id,
          taggableType: "PROJECT",
          taggableId: invite.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json(invite, { status: 201 });
}
