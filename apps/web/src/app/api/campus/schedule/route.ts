import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");

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
    return NextResponse.json({ cia: [], ia: [] });
  }

  const [cia, allExams] = await Promise.all([
    db.campusCiaSchedule.findMany({
      where: {
        campusId: targetCampusId,
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
      },
      orderBy: { scheduledAt: "asc" },
      take: 100,
    }),
    db.campusIaExam.findMany({
      where: {
        campusId: targetCampusId,
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
      },
      orderBy: { scheduledAt: "asc" },
      take: 200,
    }),
  ]);

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
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, campusId: true },
  });

  const isCampusAdmin = user?.role === "CAMPUS_MANAGER" || user?.role === "SUPER_ADMIN";

  if (!isCampusAdmin) {
    return NextResponse.json({ error: "Forbidden: Campus Admin only" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  const type = body.type === "ia" ? "ia" : "cia";

  if (!id) {
    return NextResponse.json({ error: "Entry id is required" }, { status: 400 });
  }

  if (type === "ia") {
    const scheduledAtRaw =
      typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : undefined;

    const updated = await db.campusIaExam.update({
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

    return NextResponse.json({ success: true, entry: updated });
  } else {
    const scheduledAtRaw =
      typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : undefined;

    const updated = await db.campusCiaSchedule.update({
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

    return NextResponse.json({ success: true, entry: updated });
  }
}
