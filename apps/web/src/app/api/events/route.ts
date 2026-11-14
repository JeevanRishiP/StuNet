/**
 * /api/events
 * Platform-wide Events (Hackathons, Competitions, Workshops, Meetups)
 * Distinct from Club events and campus calendar.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PlatformEventSchema } from "@stunet/types";
import { PlatformEventMode, PlatformEventType } from "@prisma/client";
import { requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { rankEventCandidates } from "@/lib/feed-ranking";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const mode = url.searchParams.get("mode") ?? undefined;
  const sort = url.searchParams.get("sort") ?? "relevant";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  const candidateTake = sort === "date" ? limit : Math.max(limit * 3, 40);

  const events = await db.platformEvent.findMany({
    where: {
      ...(type ? { type: type as PlatformEventType } : {}),
      ...(mode ? { mode: mode as PlatformEventMode } : {}),
      eventDate: { gte: new Date() }, // upcoming events
    },
    orderBy: { eventDate: "asc" },
    take: candidateTake,
    include: {
      organizer: {
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
    },
  });

  const rankedEvents = await rankEventCandidates(events, viewer, limit, { sort });
  return NextResponse.json({ items: rankedEvents });
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

  const parsed = PlatformEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid event data" },
      { status: 422 },
    );
  }

  const { name, description, mode, type, eventDate, registrationDeadline, location, tags } =
    parsed.data;

  const event = await db.platformEvent.create({
    data: {
      organizerUserId: userId,
      name,
      description,
      mode,
      type,
      eventDate,
      registrationDeadline,
      location: mode === "OFFLINE" ? location : null,
    },
    include: {
      organizer: {
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
            taggableType: "EVENT",
            taggableId: event.id,
          },
        },
        create: {
          tagId: tagRecord.id,
          taggableType: "EVENT",
          taggableId: event.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json(event, { status: 201 });
}
