import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, assertCampusScope } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

const EventPayloadSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  title: z.string().min(2, "Title must be at least 2 characters").max(200),
  category: z.string().default("General Management Event"),
  eventDate: z.string().min(1, "Event date is required"),
  endDate: z.string().optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  registrationUrl: z.string().url().optional().or(z.literal("")).nullable(),
  isPublic: z.boolean().default(true),
});

const UpdateEventSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  title: z.string().min(2).max(200).optional(),
  category: z.string().optional(),
  eventDate: z.string().optional(),
  endDate: z.string().optional().nullable(),
  venue: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  registrationUrl: z.string().url().optional().or(z.literal("")).nullable(),
  isPublic: z.boolean().optional(),
});

// GET /api/events — list management-arranged events
export async function GET(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");

  const targetCampusId =
    admin.role === "CAMPUS_MANAGER" ? admin.managedCampusId : campusParam || undefined;

  try {
    const where = {
      ...(targetCampusId ? { campusId: targetCampusId } : {}),
      eventType: { in: ["MANAGEMENT_EVENT", "fest", "workshop", "FEST", "WORKSHOP"] },
    };

    const events = await adminDb.campusCalendar.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 100,
    });

    return NextResponse.json({ events });
  } catch (err) {
    console.error("GET /api/events error:", err);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events — create a management-arranged event
export async function POST(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = EventPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      campusId,
      title,
      category,
      eventDate,
      endDate,
      venue,
      description,
      registrationUrl,
      isPublic,
    } = parsed.data;

    // Enforce campus scope for Campus Managers
    assertCampusScope(admin, campusId);

    // Encode category, venue, and registrationUrl into description if needed or clean text
    const fullDescParts: string[] = [];
    if (category) fullDescParts.push(`Category: ${category}`);
    if (venue) fullDescParts.push(`Venue: ${venue}`);
    if (registrationUrl) fullDescParts.push(`Link: ${registrationUrl}`);
    if (description) fullDescParts.push(`Details: ${description}`);
    const compositeDesc = fullDescParts.join(" | ");

    const event = await adminDb.campusCalendar.create({
      data: {
        campusId,
        createdById: admin.userId,
        title: title.trim(),
        description: compositeDesc.slice(0, 1000),
        eventDate: new Date(eventDate),
        endDate: endDate ? new Date(endDate) : null,
        eventType: "MANAGEMENT_EVENT",
        isPublic,
      },
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
    });

    await adminDb.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: "MANAGEMENT_EVENT_CREATED",
        targetType: "campus_calendar",
        targetId: event.id,
        metaJson: { title: event.title, campusId },
      },
    });

    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/events error:", err);
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 });
  }
}

// PATCH /api/events — update an event
export async function PATCH(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const {
      id,
      title,
      category,
      eventDate,
      endDate,
      venue,
      description,
      registrationUrl,
      isPublic,
    } = parsed.data;

    const existing = await adminDb.campusCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    assertCampusScope(admin, existing.campusId);

    const fullDescParts: string[] = [];
    if (category) fullDescParts.push(`Category: ${category}`);
    if (venue) fullDescParts.push(`Venue: ${venue}`);
    if (registrationUrl) fullDescParts.push(`Link: ${registrationUrl}`);
    if (description) fullDescParts.push(`Details: ${description}`);
    const compositeDesc =
      fullDescParts.length > 0 ? fullDescParts.join(" | ") : existing.description;

    const updated = await adminDb.campusCalendar.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(compositeDesc !== undefined
          ? { description: compositeDesc ? compositeDesc.slice(0, 1000) : null }
          : {}),
        ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    await adminDb.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: "MANAGEMENT_EVENT_UPDATED",
        targetType: "campus_calendar",
        targetId: updated.id,
        metaJson: { title: updated.title },
      },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (err: any) {
    console.error("PATCH /api/events error:", err);
    return NextResponse.json({ error: err.message || "Failed to update event" }, { status: 500 });
  }
}

// DELETE /api/events — delete an event
export async function DELETE(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  try {
    const existing = await adminDb.campusCalendar.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    assertCampusScope(admin, existing.campusId);

    await adminDb.campusCalendar.delete({
      where: { id },
    });

    await adminDb.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: "MANAGEMENT_EVENT_DELETED",
        targetType: "campus_calendar",
        targetId: id,
        metaJson: { title: existing.title },
      },
    });

    return NextResponse.json({ success: true, message: "Event deleted" });
  } catch (err: any) {
    console.error("DELETE /api/events error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete event" }, { status: 500 });
  }
}
