/**
 * /api/batches
 *
 * Endpoint to manage Academic Batches under campuses.
 * Rule: Success coach is exactly ONE for each batch in each campus.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, assertCampusScope } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

const CreateBatchSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  year: z.coerce.number().int().min(1950).max(2150),
  currentYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
  currentSemester: z.coerce.number().int().min(1).max(20).optional().nullable(),
  numberOfStudents: z.coerce.number().int().min(0).optional().nullable(),
  numberOfSections: z.coerce.number().int().min(0).optional().nullable(),
  sections: z.array(z.string().trim().min(1)).optional().default([]),
  degree: z.string().max(200).optional().nullable(),
  successCoachEmployeeId: z.string().max(100).optional().nullable(),
  successCoachName: z.string().max(150).optional().nullable(),
});

const UpdateBatchSchema = z.object({
  id: z.string().min(1, "Batch ID is required"),
  currentYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
  currentSemester: z.coerce.number().int().min(1).max(20).optional().nullable(),
  numberOfStudents: z.coerce.number().int().min(0).optional().nullable(),
  numberOfSections: z.coerce.number().int().min(0).optional().nullable(),
  sections: z.array(z.string().trim().min(1)).optional(),
  degree: z.string().max(200).optional().nullable(),
  successCoachEmployeeId: z.string().max(100).optional().nullable(),
  successCoachName: z.string().max(150).optional().nullable(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");

  const targetCampusId =
    session.role === "CAMPUS_MANAGER" ? session.managedCampusId : campusParam || undefined;

  if (session.role === "CAMPUS_MANAGER" && !targetCampusId) {
    return NextResponse.json({ error: "Campus manager has no assigned campus" }, { status: 400 });
  }

  try {
    const batches = await adminDb.campusBatch.findMany({
      where: targetCampusId ? { campusId: targetCampusId } : {},
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ year: "desc" }],
    });

    return NextResponse.json({ batches });
  } catch (err) {
    console.error("GET /api/batches error:", err);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();
    const parsed = CreateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid batch data", details: parsed.error.format() },
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

    // Check if batch already exists for this campus and year
    const existing = await adminDb.campusBatch.findUnique({
      where: {
        campusId_year: {
          campusId: targetCampusId,
          year: parsed.data.year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Batch for year ${parsed.data.year} already exists in this campus.` },
        { status: 409 },
      );
    }

    const currentCalYear = new Date().getFullYear();
    const autoCurrentYear =
      parsed.data.currentYear ?? Math.max(1, Math.min(4, currentCalYear - parsed.data.year + 1));
    const autoCurrentSem = parsed.data.currentSemester ?? autoCurrentYear * 2 - 1;

    const batch = await adminDb.campusBatch.create({
      data: {
        campusId: targetCampusId,
        year: parsed.data.year,
        currentYear: autoCurrentYear,
        currentSemester: autoCurrentSem,
        numberOfStudents: parsed.data.numberOfStudents || null,
        numberOfSections: parsed.data.numberOfSections || null,
        sections: parsed.data.sections || [],
        degree: parsed.data.degree || "B.Tech Computer Science & AI",
        successCoachEmployeeId: parsed.data.successCoachEmployeeId?.trim() || null,
        successCoachName: parsed.data.successCoachName?.trim() || null,
      },
      include: {
        campus: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create batch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();
    const parsed = UpdateBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const batch = await adminDb.campusBatch.findUnique({
      where: { id: parsed.data.id },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER") {
      assertCampusScope(session, batch.campusId);
    }

    const updated = await adminDb.campusBatch.update({
      where: { id: parsed.data.id },
      data: {
        ...(parsed.data.currentYear !== undefined ? { currentYear: parsed.data.currentYear } : {}),
        ...(parsed.data.currentSemester !== undefined
          ? { currentSemester: parsed.data.currentSemester }
          : {}),
        ...(parsed.data.numberOfStudents !== undefined
          ? { numberOfStudents: parsed.data.numberOfStudents }
          : {}),
        ...(parsed.data.numberOfSections !== undefined
          ? { numberOfSections: parsed.data.numberOfSections }
          : {}),
        ...(parsed.data.sections !== undefined ? { sections: parsed.data.sections } : {}),
        ...(parsed.data.degree !== undefined ? { degree: parsed.data.degree } : {}),
        ...(parsed.data.successCoachEmployeeId !== undefined
          ? { successCoachEmployeeId: parsed.data.successCoachEmployeeId?.trim() || null }
          : {}),
        ...(parsed.data.successCoachName !== undefined
          ? { successCoachName: parsed.data.successCoachName?.trim() || null }
          : {}),
      },
      include: {
        campus: { select: { name: true } },
      },
    });

    // CASCADE: When currentYear or currentSemester is updated, update ALL students and roster in this batch!
    if (parsed.data.currentYear !== undefined || parsed.data.currentSemester !== undefined) {
      const studentUsers = await adminDb.userIdentity.findMany({
        where: {
          campusId: batch.campusId,
          role: "STUDENT",
          joiningYear: batch.year,
        },
        select: { id: true },
      });

      const studentUserIds = studentUsers.map((u) => u.id);
      if (studentUserIds.length > 0) {
        await adminDb.studentAcademicDetails.updateMany({
          where: { userId: { in: studentUserIds } },
          data: {
            ...(parsed.data.currentYear !== undefined
              ? { currentCourseYear: parsed.data.currentYear }
              : {}),
            ...(parsed.data.currentSemester !== undefined
              ? { currentSemester: parsed.data.currentSemester }
              : {}),
          },
        });
      }

      await adminDb.institutionalRoster.updateMany({
        where: {
          campusId: batch.campusId,
          role: "STUDENT",
          joinedYear: batch.year,
        },
        data: {
          ...(parsed.data.currentYear !== undefined
            ? { currentCourseYear: parsed.data.currentYear }
            : {}),
          ...(parsed.data.currentSemester !== undefined
            ? { currentSemester: parsed.data.currentSemester }
            : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Batch updated successfully",
      batch: updated,
    });
  } catch (err) {
    console.error("PATCH /api/batches error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update batch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Batch ID is required" }, { status: 400 });
  }

  try {
    const batch = await adminDb.campusBatch.findUnique({ where: { id } });
    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER") {
      assertCampusScope(session, batch.campusId);
    }

    await adminDb.campusBatch.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Batch deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/batches error:", err);
    return NextResponse.json({ error: "Failed to delete batch" }, { status: 500 });
  }
}
