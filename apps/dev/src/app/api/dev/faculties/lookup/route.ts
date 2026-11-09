import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const employeeId = req.nextUrl.searchParams.get("employeeId")?.trim();
  const campusId = req.nextUrl.searchParams.get("campusId")?.trim();

  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
  }

  try {
    const campusFaculty = await devDb.campusFaculty.findFirst({
      where: {
        employeeId: { equals: employeeId, mode: "insensitive" },
        ...(campusId ? { campusId } : {}),
      },
      select: {
        id: true,
        name: true,
        employeeId: true,
        designation: true,
        department: true,
        category: true,
        campusId: true,
      },
    });

    if (campusFaculty) {
      return NextResponse.json({
        found: true,
        source: "campus_faculties",
        faculty: campusFaculty,
      });
    }

    const facultyDetails = await devDb.facultyDetails.findFirst({
      where: {
        employeeId: { equals: employeeId, mode: "insensitive" },
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            campusId: true,
          },
        },
      },
    });

    if (facultyDetails && facultyDetails.user) {
      return NextResponse.json({
        found: true,
        source: "faculty_details",
        faculty: {
          id: facultyDetails.user.id,
          name: facultyDetails.user.displayName,
          employeeId: facultyDetails.employeeId,
          designation: facultyDetails.designation ?? "Faculty Member",
          department: facultyDetails.department ?? "Academics",
          category: facultyDetails.category ?? "TEACHING",
          campusId: facultyDetails.user.campusId,
        },
      });
    }

    return NextResponse.json({
      found: false,
      message: `No faculty found for Employee ID: ${employeeId}`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Lookup failed", detail: String(err) }, { status: 500 });
  }
}
