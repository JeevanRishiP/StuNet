/**
 * GET /api/faculties/lookup?employeeId=...&campusId=...
 *
 * Auto-detects faculty member by employeeId across:
 * 1. campus_faculties table
 * 2. faculty_details + user_identity table
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { enrollmentDb } from "@/lib/enrollmentDb";

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId")?.trim();
  const campusId = searchParams.get("campusId")?.trim();

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  try {
    // 1. Check CampusFaculty table
    const cf = await adminDb.campusFaculty.findFirst({
      where: {
        employeeId: { equals: employeeId, mode: "insensitive" },
        ...(campusId ? { campusId } : {}),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        designation: true,
        department: true,
        category: true,
        campusId: true,
        email: true,
      },
    });

    if (cf && cf.name) {
      return NextResponse.json({
        found: true,
        faculty: {
          id: cf.id,
          name: cf.name,
          employeeId: cf.employeeId ?? employeeId,
          designation: cf.designation,
          department: cf.department,
          category: cf.category,
          campusId: cf.campusId,
          email: cf.email,
        },
      });
    }

    // 2. Check FacultyDetails + UserIdentity
    const fd = await enrollmentDb.facultyDetails.findFirst({
      where: {
        employeeId: { equals: employeeId, mode: "insensitive" },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            headline: true,
            campusId: true,
          },
        },
      },
    });

    if (fd && fd.user) {
      return NextResponse.json({
        found: true,
        faculty: {
          id: fd.userId,
          name: fd.user.displayName,
          employeeId: fd.employeeId,
          designation: fd.user.headline ?? "Faculty Member",
          department: "Academic Faculty",
          category: "TEACHING",
          campusId: fd.user.campusId,
          email: null,
        },
      });
    }

    return NextResponse.json({ found: false, message: "No faculty found with this employee ID" });
  } catch (err) {
    console.error("GET /api/faculties/lookup error:", err);
    return NextResponse.json({ error: "Failed to lookup faculty" }, { status: 500 });
  }
}
