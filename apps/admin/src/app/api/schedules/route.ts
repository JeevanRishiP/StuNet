import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/schedules — list CIA, SA, IA, and SEE schedules for campus
export async function GET(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (err: any) {
    return NextResponse.json({ error: "Unauthorized", details: err?.message }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const upcomingOnly = searchParams.get("upcomingOnly") === "true";
    const campusParam = searchParams.get("campusId") || searchParams.get("campus");
    const now = new Date();

    const targetCampusId =
      admin.role === "CAMPUS_MANAGER"
        ? admin.managedCampusId || admin.campusId || campusParam
        : campusParam || admin.managedCampusId || admin.campusId;

    const campusFilter = targetCampusId ? { campusId: targetCampusId } : {};
    const dateFilter = upcomingOnly ? { scheduledAt: { gte: now } } : {};

    const [cia, allExams] = await Promise.all([
      adminDb.campusCiaSchedule.findMany({
        where: {
          ...campusFilter,
          ...dateFilter,
        },
        select: {
          id: true,
          subject: true,
          code: true,
          component: true,
          scheduledAt: true,
          venue: true,
          topic: true,
          status: true,
          notes: true,
          campusId: true,
          campus: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 100,
      }),
      adminDb.campusIaExam.findMany({
        where: {
          ...campusFilter,
          ...dateFilter,
        },
        select: {
          id: true,
          subject: true,
          code: true,
          examType: true,
          scheduledAt: true,
          durationMins: true,
          venue: true,
          syllabus: true,
          syllabusUrl: true,
          questionBankUrl: true,
          isTentative: true,
          notes: true,
          campusId: true,
          campus: { select: { name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 200,
      }),
    ]);

    // Partition exams cleanly into IA, SA (Skill Assessment), and SEE (Semester End Exams)
    const ia = allExams.filter(
      (e) =>
        e.examType === "IA-1" ||
        e.examType === "IA-2" ||
        e.examType === "IA 1" ||
        e.examType === "IA 2",
    );

    const sa = allExams.filter(
      (e) => e.examType === "SKILL-ASSESSMENT" || e.examType?.toUpperCase().includes("SKILL"),
    );

    const see = allExams.filter(
      (e) =>
        e.examType.startsWith("SEE") ||
        e.examType?.toLowerCase().includes("semester end") ||
        e.examType?.toLowerCase().includes("practical"),
    );

    return NextResponse.json({ cia, ia, sa, see, allExams });
  } catch (err: any) {
    console.error("GET /api/schedules error:", err);
    return NextResponse.json(
      { error: "Failed to fetch schedules from database", details: err?.message },
      { status: 500 },
    );
  }
}

// POST /api/schedules — create CIA, IA, SEE, or batch Skill Assessment entries
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

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = String(body.type || "ia").toLowerCase();
  const targetCampusId =
    admin.role === "SUPER_ADMIN" && typeof body.campusId === "string"
      ? body.campusId
      : (campusId ?? null);

  if (!targetCampusId) {
    return NextResponse.json({ error: "campusId required" }, { status: 400 });
  }

  try {
    // ── 1. BATCH SKILL ASSESSMENT (SA) ──
    if (type === "sa" || type === "skill-assessment") {
      const scheduledAtRaw =
        typeof body.scheduledAt === "string" && body.scheduledAt
          ? new Date(body.scheduledAt)
          : new Date(); // default fallback
      const isTentative = Boolean(body.isTentative);
      const venue = typeof body.venue === "string" ? body.venue.trim() || null : null;
      const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;

      const subjects = Array.isArray(body.subjects) ? body.subjects : [];
      if (subjects.length === 0) {
        return NextResponse.json(
          { error: "At least one NIAT core subject is required for Skill Assessment" },
          { status: 400 },
        );
      }

      const examTypeToUse =
        typeof body.examType === "string" && body.examType.trim()
          ? body.examType.trim()
          : "SKILL-ASSESSMENT-2";

      // Delete existing Skill Assessment records for this specific cycle for clean synchronization
      await adminDb.campusIaExam.deleteMany({
        where: {
          campusId: targetCampusId,
          examType: examTypeToUse,
        },
      });

      // Insert all 6 NIAT subject records with the unified date/venue
      const createdEntries = await Promise.all(
        subjects.map((sub: any) =>
          adminDb.campusIaExam.create({
            data: {
              campusId: targetCampusId,
              createdById: admin.userId,
              subject: sub.name?.trim() || "NIAT Core Module",
              code: sub.code?.trim() || null,
              examType: examTypeToUse,
              scheduledAt: isNaN(scheduledAtRaw.getTime()) ? new Date() : scheduledAtRaw,
              venue: venue || "CCBP Exam Lab",
              syllabus: sub.syllabus?.trim() || null,
              questionBankUrl:
                sub.questionBankUrl?.trim() ||
                "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
              isTentative,
              notes,
            },
          }),
        ),
      );

      // Notify all campus students
      try {
        const students = await adminDb.userIdentity.findMany({
          where: { campusId: targetCampusId, role: "STUDENT", isActive: true },
          select: { id: true },
        });

        if (students.length > 0) {
          const dateStr = isTentative
            ? "Date Tentative (To Be Announced)"
            : new Date(scheduledAtRaw).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

          await adminDb.notification.createMany({
            data: students.map((s) => ({
              recipientId: s.id,
              triggeredById: admin.userId,
              type: "SYSTEM",
              title: "NIAT Skill Assessment Scheduled",
              body: `Single-day skill assessment scheduled for all 6 NIAT core modules (${dateStr}).`,
              actionUrl: "/campus",
            })),
          });
        }
      } catch (notifErr) {
        console.warn("Failed to broadcast skill assessment notifications:", notifErr);
      }

      return NextResponse.json(
        {
          type: "sa",
          message: `Successfully published Skill Assessment for ${createdEntries.length} NIAT courses.`,
          entries: createdEntries,
        },
        { status: 201 },
      );
    }

    // ── 2. SINGLE ENTRY CREATION (CIA, IA, SEE) ──
    const subject = typeof body.subject === "string" ? body.subject.trim() : null;
    const code = typeof body.code === "string" ? body.code.trim() || null : null;
    const scheduledAtRaw = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;

    if (!subject || !scheduledAtRaw || isNaN(scheduledAtRaw.getTime())) {
      return NextResponse.json({ error: "subject and scheduledAt are required" }, { status: 400 });
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
          code,
          component,
          scheduledAt: scheduledAtRaw,
          venue: typeof body.venue === "string" ? body.venue.trim() || null : null,
          topic: typeof body.topic === "string" ? body.topic.trim() || null : null,
          status: typeof body.status === "string" ? body.status.trim() || "PENDING" : "PENDING",
          notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        },
      });

      return NextResponse.json({ type: "cia", entry }, { status: 201 });
    } else {
      // IA or Semester End Exam (SEE)
      const examType =
        typeof body.examType === "string"
          ? body.examType.trim()
          : type === "see"
            ? "SEE-Theory"
            : "IA-1";

      const entry = await adminDb.campusIaExam.create({
        data: {
          campusId: targetCampusId,
          createdById: admin.userId,
          subject,
          code,
          examType,
          scheduledAt: scheduledAtRaw,
          durationMins: typeof body.durationMins === "number" ? body.durationMins : null,
          venue: typeof body.venue === "string" ? body.venue.trim() || null : null,
          syllabus: typeof body.syllabus === "string" ? body.syllabus.trim() || null : null,
          syllabusUrl:
            typeof body.syllabusUrl === "string" ? body.syllabusUrl.trim() || null : null,
          questionBankUrl:
            typeof body.questionBankUrl === "string" ? body.questionBankUrl.trim() || null : null,
          isTentative: Boolean(body.isTentative),
          notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
        },
      });

      return NextResponse.json({ type, entry }, { status: 201 });
    }
  } catch (err: any) {
    console.error("POST /api/schedules error:", err);
    return NextResponse.json(
      { error: "Failed to create schedule entry", details: err?.message },
      { status: 500 },
    );
  }
}

// PATCH /api/schedules — update an existing CIA schedule or IA/SEE/SA exam entry
export async function PATCH(req: NextRequest) {
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

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : null;
    const type = String(body.type || "ia").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
    }

    if (type === "cia") {
      const existing = await adminDb.campusCiaSchedule.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "CIA schedule not found" }, { status: 404 });
      }
      if (admin.role !== "SUPER_ADMIN" && existing.campusId !== admin.managedCampusId) {
        return NextResponse.json({ error: "Forbidden: cross-campus mutation" }, { status: 403 });
      }

      const scheduledAtRaw =
        typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : undefined;

      const updated = await adminDb.campusCiaSchedule.update({
        where: { id },
        data: {
          ...(typeof body.subject === "string" ? { subject: body.subject.trim() } : {}),
          ...(typeof body.code === "string" ? { code: body.code.trim() || null } : {}),
          ...(typeof body.component === "string" ? { component: body.component.trim() } : {}),
          ...(scheduledAtRaw && !isNaN(scheduledAtRaw.getTime())
            ? { scheduledAt: scheduledAtRaw }
            : {}),
          ...(typeof body.venue === "string" ? { venue: body.venue.trim() || null } : {}),
          ...(typeof body.topic === "string" ? { topic: body.topic.trim() || null } : {}),
          ...(typeof body.status === "string" ? { status: body.status.trim() || "PENDING" } : {}),
          ...(typeof body.notes === "string" ? { notes: body.notes.trim() || null } : {}),
        },
      });

      return NextResponse.json({ type: "cia", entry: updated });
    } else {
      const existing = await adminDb.campusIaExam.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Exam entry not found" }, { status: 404 });
      }
      if (admin.role !== "SUPER_ADMIN" && existing.campusId !== admin.managedCampusId) {
        return NextResponse.json({ error: "Forbidden: cross-campus mutation" }, { status: 403 });
      }

      const scheduledAtRaw =
        typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : undefined;

      const updated = await adminDb.campusIaExam.update({
        where: { id },
        data: {
          ...(typeof body.subject === "string" ? { subject: body.subject.trim() } : {}),
          ...(typeof body.code === "string" ? { code: body.code.trim() || null } : {}),
          ...(typeof body.examType === "string" ? { examType: body.examType.trim() } : {}),
          ...(scheduledAtRaw && !isNaN(scheduledAtRaw.getTime())
            ? { scheduledAt: scheduledAtRaw }
            : {}),
          ...(body.durationMins !== undefined
            ? { durationMins: typeof body.durationMins === "number" ? body.durationMins : null }
            : {}),
          ...(typeof body.venue === "string" ? { venue: body.venue.trim() || null } : {}),
          ...(typeof body.syllabus === "string" ? { syllabus: body.syllabus.trim() || null } : {}),
          ...(typeof body.syllabusUrl === "string"
            ? { syllabusUrl: body.syllabusUrl.trim() || null }
            : {}),
          ...(typeof body.questionBankUrl === "string"
            ? { questionBankUrl: body.questionBankUrl.trim() || null }
            : body.questionBankUrl === null
              ? { questionBankUrl: null }
              : {}),
          ...(body.isTentative !== undefined ? { isTentative: Boolean(body.isTentative) } : {}),
          ...(typeof body.notes === "string" ? { notes: body.notes.trim() || null } : {}),
        },
      });

      return NextResponse.json({ type, entry: updated });
    }
  } catch (err: any) {
    console.error("PATCH /api/schedules error:", err);
    return NextResponse.json(
      { error: "Failed to update schedule entry", details: err?.message },
      { status: 500 },
    );
  }
}

// DELETE /api/schedules — delete an existing CIA schedule or IA/SEE/SA exam entry
export async function DELETE(req: NextRequest) {
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

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = String(searchParams.get("type") || "ia").toLowerCase();

    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    if (type === "cia") {
      const existing = await adminDb.campusCiaSchedule.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "CIA schedule not found" }, { status: 404 });
      }
      if (admin.role !== "SUPER_ADMIN" && existing.campusId !== admin.managedCampusId) {
        return NextResponse.json({ error: "Forbidden: cross-campus mutation" }, { status: 403 });
      }
      await adminDb.campusCiaSchedule.delete({ where: { id } });
      return NextResponse.json({ success: true, deletedId: id });
    } else {
      const existing = await adminDb.campusIaExam.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Exam entry not found" }, { status: 404 });
      }
      if (admin.role !== "SUPER_ADMIN" && existing.campusId !== admin.managedCampusId) {
        return NextResponse.json({ error: "Forbidden: cross-campus mutation" }, { status: 403 });
      }
      await adminDb.campusIaExam.delete({ where: { id } });
      return NextResponse.json({ success: true, deletedId: id });
    }
  } catch (err: any) {
    console.error("DELETE /api/schedules error:", err);
    return NextResponse.json(
      { error: "Failed to delete schedule entry", details: err?.message },
      { status: 500 },
    );
  }
}
