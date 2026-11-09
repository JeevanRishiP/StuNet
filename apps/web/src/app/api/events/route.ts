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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? undefined;
  const mode = url.searchParams.get("mode") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  const events = await db.platformEvent.findMany({
    where: {
      ...(type ? { type: type as PlatformEventType } : {}),
      ...(mode ? { mode: mode as PlatformEventMode } : {}),
      eventDate: { gte: new Date() }, // upcoming events
    },
    orderBy: { eventDate: "asc" },
    take: limit,
    include: {
      organizer: {
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

  return NextResponse.json({ items: events });
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

  const parsed = PlatformEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid event data" },
      { status: 422 },
    );
  }

  const { name, description, mode, type, eventDate, registrationDeadline, location } = parsed.data;

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

  return NextResponse.json(event, { status: 201 });
}
