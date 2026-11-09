/**
 * /api/subjects
 *
 * Endpoint to manage Semester Subjects.
 * Handles: Campus, Batch Year, Semester (1-8), Subject metadata,
 * HOD employee ID/name auto-detection, multiple Teaching Faculties, and multiple Mentors.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, assertCampusScope } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

const SubjectItemSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(200),
  code: z.string().max(50).optional().nullable(),
  credits: z.coerce.number().int().min(1).max(10).default(3),
  type: z.enum(["Theory", "Practical"]).default("Theory"),
  handledBy: z.enum(["University", "NIAT"]).default("University"),
  hodEmployeeId: z.string().max(100).optional().nullable(),
  hodName: z.string().max(150).optional().nullable(),
  teachingFacultyIds: z.array(z.string()).default([]),
  teachingFacultyNames: z.array(z.string()).default([]),
  mentorFacultyIds: z.array(z.string()).default([]),
  mentorFacultyNames: z.array(z.string()).default([]),
});

const SaveSemesterSubjectsSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  batchYear: z.coerce.number().int().min(1950).max(2150),
  semester: z.coerce.number().int().min(1).max(8),
  subjects: z.array(SubjectItemSchema).min(1, "At least one subject is required"),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");
  const batchYearParam = searchParams.get("batchYear");
  const semesterParam = searchParams.get("semester");

  const targetCampusId =
    session.role === "CAMPUS_MANAGER" ? session.managedCampusId : campusParam || undefined;

  if (session.role === "CAMPUS_MANAGER" && !targetCampusId) {
    return NextResponse.json({ error: "Campus manager has no assigned campus" }, { status: 400 });
  }

  try {
    const where = {
      ...(targetCampusId ? { campusId: targetCampusId } : {}),
      ...(batchYearParam ? { batchYear: parseInt(batchYearParam, 10) } : {}),
      ...(semesterParam ? { semester: parseInt(semesterParam, 10) } : {}),
    };

    const subjects = await adminDb.semesterSubject.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ batchYear: "desc" }, { semester: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ subjects });
  } catch (err) {
    console.error("GET /api/subjects error:", err);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();
    const parsed = SaveSemesterSubjectsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid subject data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const targetCampusId =
      session.role === "CAMPUS_MANAGER" ? session.managedCampusId : parsed.data.campusId;

    if (!targetCampusId) {
      return NextResponse.json({ error: "Target campus is required" }, { status: 400 });
    }

    if (session.role === "CAMPUS_MANAGER") {
      assertCampusScope(session, targetCampusId);
    }

    const { batchYear, semester, subjects } = parsed.data;

    // Create each subject in the semester
    const created = await Promise.all(
      subjects.map((sub) =>
        adminDb.semesterSubject.create({
          data: {
            campusId: targetCampusId,
            batchYear,
            semester,
            name: sub.name.trim(),
            code: sub.code?.trim() || null,
            credits: sub.credits,
            type: sub.type,
            handledBy: sub.handledBy,
            hodEmployeeId: sub.hodEmployeeId?.trim() || null,
            hodName: sub.hodName?.trim() || null,
            teachingFacultyIds: sub.teachingFacultyIds,
            teachingFacultyNames: sub.teachingFacultyNames,
            mentorFacultyIds: sub.mentorFacultyIds,
            mentorFacultyNames: sub.mentorFacultyNames,
          },
        }),
      ),
    );

    return NextResponse.json(
      {
        success: true,
        message: `Successfully enrolled ${created.length} subject(s) for Semester ${semester} (Batch ${batchYear}).`,
        subjects: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/subjects error:", err);
    return NextResponse.json({ error: "Failed to save subjects" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Subject ID is required" }, { status: 400 });
  }

  try {
    const subject = await adminDb.semesterSubject.findUnique({ where: { id } });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER") {
      assertCampusScope(session, subject.campusId);
    }

    await adminDb.semesterSubject.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Subject removed successfully" });
  } catch (err) {
    console.error("DELETE /api/subjects error:", err);
    return NextResponse.json({ error: "Failed to delete subject" }, { status: 500 });
  }
}
