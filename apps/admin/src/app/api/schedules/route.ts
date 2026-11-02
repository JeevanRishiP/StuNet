import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

// GET /api/schedules — list CIA schedules for campus
export async function GET() {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [cia, ia] = await Promise.all([
    adminDb.campusCiaSchedule.findMany({
      where: {
        ...(admin.managedCampusId ? { campusId: admin.managedCampusId } : {}),
        scheduledAt: { gte: now },
      },
      select: {
        id: true,
        subject: true,
        component: true,
        scheduledAt: true,
        venue: true,
        notes: true,
        campusId: true,
        campus: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    }),
    adminDb.campusIaExam.findMany({
      where: {
        ...(admin.managedCampusId ? { campusId: admin.managedCampusId } : {}),
        scheduledAt: { gte: now },
      },
      select: {
        id: true,
        subject: true,
        examType: true,
        scheduledAt: true,
        durationMins: true,
        venue: true,
        syllabusUrl: true,
        notes: true,
        campusId: true,
        campus: { select: { name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ cia, ia });
}

// POST /api/schedules — create a CIA schedule or IA exam entry
export async function POST(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["CAMPUS_MANAGER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(admin.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campusId = admin.managedCampusId;
  if (!campusId && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No campus scope" }, { status: 400 });
  }

  let body: {
    type?: unknown;
    subject?: unknown;
    component?: unknown;
    examType?: unknown;
    scheduledAt?: unknown;
    venue?: unknown;
    notes?: unknown;
    durationMins?: unknown;
    syllabusUrl?: unknown;
    campusId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type === "ia" ? "ia" : "cia";
  const subject = typeof body.subject === "string" ? body.subject.trim() : null;
  const scheduledAtRaw = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;

  if (!subject || !scheduledAtRaw || isNaN(scheduledAtRaw.getTime())) {
    return NextResponse.json({ error: "subject and scheduledAt are required" }, { status: 400 });
  }

  const targetCampusId =
    admin.role === "SUPER_ADMIN" && typeof body.campusId === "string"
      ? body.campusId
      : (campusId ?? null);

  if (!targetCampusId) {
    return NextResponse.json({ error: "campusId required" }, { status: 400 });
  }

  if (type === "cia") {
    const component = typeof body.component === "string" ? body.component.trim() : null;
    if (!component) {
      return NextResponse.json({ error: "component is required for CIA" }, { status: 400 });
    }

    const entry = await adminDb.campusCiaSchedule.create({
      data: {
        campusId: targetCampusId,
        createdById: admin.userId,
        subject,
        component,
        scheduledAt: scheduledAtRaw,
        venue: typeof body.venue === "string" ? body.venue.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      },
      select: { id: true, subject: true, component: true, scheduledAt: true },
    });

    return NextResponse.json({ type: "cia", entry }, { status: 201 });
  } else {
    const examType = typeof body.examType === "string" ? body.examType.trim() : null;
    if (!examType) {
      return NextResponse.json({ error: "examType is required for IA" }, { status: 400 });
    }

    const entry = await adminDb.campusIaExam.create({
      data: {
        campusId: targetCampusId,
        createdById: admin.userId,
        subject,
        examType,
        scheduledAt: scheduledAtRaw,
        durationMins: typeof body.durationMins === "number" ? body.durationMins : null,
        venue: typeof body.venue === "string" ? body.venue.trim() || null : null,
        syllabusUrl: typeof body.syllabusUrl === "string" ? body.syllabusUrl.trim() || null : null,
        notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      },
      select: { id: true, subject: true, examType: true, scheduledAt: true },
    });

    return NextResponse.json({ type: "ia", entry }, { status: 201 });
  }
}
