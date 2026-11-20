import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const CreateCalendarSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  eventDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
  eventType: z.enum(["holiday", "academic", "exam", "fest", "workshop"]).default("holiday"),
  isPublic: z.boolean().default(true),
});

const UpdateCalendarSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  eventDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  eventType: z.enum(["holiday", "academic", "exam", "fest", "workshop"]).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await adminDb.campusCalendar.findMany({
      where: { campusId: params.id },
      orderBy: { eventDate: "asc" },
    });
    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("Failed to load campus calendar:", error);
    return NextResponse.json({ error: "Failed to load campus calendar" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = CreateCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid calendar data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { title, description, eventDate, endDate, eventType, isPublic } = parsed.data;

    const event = await adminDb.campusCalendar.create({
      data: {
        campusId: params.id,
        createdById: session.user.id ?? "admin",
        title: title.trim(),
        description: description ? description.trim() : null,
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        eventType,
        isPublic,
      },
    });

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error("Failed to create campus calendar entry:", error);
    return NextResponse.json({ error: "Failed to create campus calendar entry" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { id, title, description, eventDate, endDate, eventType, isPublic } = parsed.data;

    // Verify ownership/campus match
    const existing = await adminDb.campusCalendar.findUnique({
      where: { id },
    });
    if (!existing || existing.campusId !== params.id) {
      return NextResponse.json(
        { error: "Calendar entry not found for this campus" },
        { status: 404 },
      );
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined)
      dataToUpdate.description = description ? description.trim() : null;
    if (eventDate !== undefined) dataToUpdate.eventDate = new Date(eventDate);
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (eventType !== undefined) dataToUpdate.eventType = eventType;
    if (isPublic !== undefined) dataToUpdate.isPublic = isPublic;

    const updated = await adminDb.campusCalendar.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error("Failed to update campus calendar entry:", error);
    return NextResponse.json({ error: "Failed to update campus calendar entry" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let calendarId = searchParams.get("calendarId");

    if (!calendarId) {
      try {
        const body = await req.json();
        calendarId = body.calendarId || body.id;
      } catch {
        // body might be empty
      }
    }

    if (!calendarId) {
      return NextResponse.json({ error: "Missing calendarId parameter" }, { status: 400 });
    }

    const existing = await adminDb.campusCalendar.findUnique({
      where: { id: calendarId },
    });
    if (!existing || existing.campusId !== params.id) {
      return NextResponse.json(
        { error: "Calendar entry not found for this campus" },
        { status: 404 },
      );
    }

    await adminDb.campusCalendar.delete({
      where: { id: calendarId },
    });

    return NextResponse.json({ success: true, message: "Calendar entry deleted successfully" });
  } catch (error) {
    console.error("Failed to delete campus calendar entry:", error);
    return NextResponse.json({ error: "Failed to delete campus calendar entry" }, { status: 500 });
  }
}
