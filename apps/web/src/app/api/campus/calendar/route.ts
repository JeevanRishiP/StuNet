import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateEventSchema = z.object({
  title: z.string().min(2, "Title is required").max(200),
  description: z.string().max(1000).optional().nullable(),
  eventDate: z.string().min(1, "Event date is required"),
  endDate: z.string().optional().nullable(),
  eventType: z.string().max(100).default("CLUB_EVENT"),
  campusId: z.string().min(1, "Campus ID is required"),
  isPublic: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");
  const typeParam = searchParams.get("type"); // e.g. "CLUB_EVENT" or "MANAGEMENT_EVENT"

  let targetCampusId: string | null = null;
  if (session?.user?.id) {
    const identity = await db.userIdentity.findUnique({
      where: { id: session.user.id },
      select: { campusId: true },
    });
    targetCampusId = identity?.campusId || null;
  }

  if (!targetCampusId && campusParam) {
    targetCampusId = campusParam;
  }

  if (!targetCampusId) {
    const firstCampus = await db.campus.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    targetCampusId = firstCampus?.id || null;
  }

  if (!targetCampusId) {
    return NextResponse.json({ events: [] });
  }

  const where: any = {
    campusId: targetCampusId,
    isPublic: true,
  };

  if (typeParam) {
    where.eventType = typeParam;
  }

  const events = await db.campusCalendar.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      endDate: true,
      eventType: true,
      createdById: true,
    },
    orderBy: { eventDate: "asc" },
    take: 100,
  });

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { title, description, eventDate, endDate, eventType, campusId, isPublic } = parsed.data;

    const event = await db.campusCalendar.create({
      data: {
        campusId,
        createdById: session.user.id,
        title: title.trim(),
        description: description ? description.trim() : null,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        eventType: eventType || "CLUB_EVENT",
        isPublic,
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/campus/calendar error:", err);
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  try {
    const existing = await db.campusCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Allow author or admins to delete
    const isOwner = existing.createdById === session.user.id;
    const isStaff = session.user.role === "FACULTY" || session.user.role === "COMMUNITY_ADMIN";

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete events you created" },
        { status: 403 },
      );
    }

    await db.campusCalendar.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (err: any) {
    console.error("DELETE /api/campus/calendar error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete event" }, { status: 500 });
  }
}
