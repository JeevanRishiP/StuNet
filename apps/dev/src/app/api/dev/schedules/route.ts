/**
 * GET  /api/dev/schedules?campusId=&type=cia|ia|calendar
 * POST /api/dev/schedules
 * PATCH /api/dev/schedules
 * DELETE /api/dev/schedules?id=&type=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const campusId = searchParams.get("campusId") ?? undefined;
  const type = searchParams.get("type") ?? "cia";

  if (type === "ia") {
    const exams = await devDb.campusIaExam.findMany({
      where: campusId ? { campusId } : {},
      orderBy: { scheduledAt: "asc" },
      include: { campus: { select: { name: true } } },
    });
    return NextResponse.json({ items: exams });
  }

  if (type === "calendar") {
    const events = await devDb.campusCalendar.findMany({
      where: campusId ? { campusId } : {},
      orderBy: { eventDate: "asc" },
      include: { campus: { select: { name: true } } },
    });
    return NextResponse.json({ items: events });
  }

  // Default: CIA schedules
  const schedules = await devDb.campusCiaSchedule.findMany({
    where: campusId ? { campusId } : {},
    orderBy: { scheduledAt: "asc" },
    include: { campus: { select: { name: true } } },
  });
  return NextResponse.json({ items: schedules });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const type = body.type as string;

  try {
    if (type === "ia") {
      const exam = await devDb.campusIaExam.create({
        data: {
          campusId: body.campusId as string,
          createdById: (body.createdById as string) || "dev-console",
          subject: body.subject as string,
          examType: body.examType as string, // e.g. "IA-1", "IA-2", "End Semester"
          scheduledAt: new Date(body.scheduledAt as string),
          durationMins: body.durationMins ? Number(body.durationMins) : null,
          venue: (body.venue as string | null) ?? null,
          notes: (body.notes as string | null) ?? null,
        },
      });
      return NextResponse.json({ item: exam }, { status: 201 });
    }

    if (type === "calendar") {
      const event = await devDb.campusCalendar.create({
        data: {
          campusId: body.campusId as string,
          createdById: (body.createdById as string) || "dev-console",
          title: body.title as string,
          description: (body.description as string | null) ?? null,
          eventDate: new Date(body.eventDate as string),
          endDate: body.endDate ? new Date(body.endDate as string) : null,
          eventType: body.eventType as string, // e.g. "holiday", "fest", "workshop"
          isPublic: body.isPublic !== false,
        },
      });
      return NextResponse.json({ item: event }, { status: 201 });
    }

    // CIA
    const schedule = await devDb.campusCiaSchedule.create({
      data: {
        campusId: body.campusId as string,
        createdById: (body.createdById as string) || "dev-console",
        subject: body.subject as string,
        component: body.component as string, // e.g. "CIA-1", "CIA-2", "Model"
        scheduledAt: new Date(body.scheduledAt as string),
        venue: (body.venue as string | null) ?? null,
        notes: (body.notes as string | null) ?? null,
      },
    });
    return NextResponse.json({ item: schedule }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;
  const type = body.type as string;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const {
    id: _id,
    type: _type,
    campus: _campus,
    createdAt: _c,
    updatedAt: _u,
    ...cleanData
  } = body;

  try {
    if (type === "ia") {
      const exam = await devDb.campusIaExam.update({ where: { id }, data: cleanData });
      return NextResponse.json({ item: exam });
    }
    if (type === "calendar") {
      const event = await devDb.campusCalendar.update({ where: { id }, data: cleanData });
      return NextResponse.json({ item: event });
    }
    const schedule = await devDb.campusCiaSchedule.update({ where: { id }, data: cleanData });
    return NextResponse.json({ item: schedule });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") ?? "cia";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    if (type === "ia") await devDb.campusIaExam.delete({ where: { id } });
    else if (type === "calendar") await devDb.campusCalendar.delete({ where: { id } });
    else await devDb.campusCiaSchedule.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
