import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { enrollmentDb } from "@/lib/enrollmentDb";
import { auth } from "@/lib/auth";
import { z } from "zod";

const UpdateCampusSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  universityName: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  emailDomain: z.string().max(100).optional(),
  websiteUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  facilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const campus = await adminDb.campus.findUnique({
      where: { id },
      include: {
        faculties: {
          orderBy: { createdAt: "asc" },
        },
        clubs: {
          include: {
            members: {
              where: {
                role: {
                  in: [
                    "PRESIDENT",
                    "VICE_PRESIDENT",
                    "OPERATIONAL_HEAD",
                    "OUTREACH_HEAD",
                    "FINANCE_HEAD",
                    "CREATIVE_DESIGN_HEAD",
                    "SOCIAL_MEDIA_HEAD",
                  ],
                },
              },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
        liveAlerts: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        ciaSchedules: {
          orderBy: { scheduledAt: "asc" },
          take: 10,
        },
        iaExams: {
          orderBy: { scheduledAt: "asc" },
          take: 5,
        },
        _count: {
          select: {
            userIdentities: true,
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    // Merge any faculty enrolled through user_identity not yet in campus_faculties
    let enrolledFacultyUsers: Array<
      (typeof campus.faculties)[number] & {
        displayName?: string;
        facultyDetails?: {
          employeeId?: string | null;
          department?: string | null;
          designation?: string | null;
          category?: string | null;
        } | null;
        headline?: string | null;
      }
    > = [];

    try {
      enrolledFacultyUsers = (await enrollmentDb.userIdentity.findMany({
        where: { campusId: id, role: "FACULTY" },
        include: { facultyDetails: true },
      })) as unknown as typeof enrolledFacultyUsers;
    } catch {
      // fallback
    }

    const enrolledUserIds = enrolledFacultyUsers.map((u) => u.id);
    let privMap = new Map<string, string>();
    try {
      if (enrolledUserIds.length > 0) {
        const privates = await enrollmentDb.userPrivateDetails.findMany({
          where: { userId: { in: enrolledUserIds } },
          select: { userId: true, email: true },
        });
        privMap = new Map(privates.map((p) => [p.userId, p.email]));
      }
    } catch {
      // ignore
    }

    const existingFacultyEmpIds = new Set(
      campus.faculties.map((f) => f.employeeId).filter(Boolean),
    );
    const existingFacultyNames = new Set(campus.faculties.map((f) => f.name.toLowerCase().trim()));

    const mergedFaculties = [...campus.faculties];

    for (const u of enrolledFacultyUsers) {
      const empId = u.facultyDetails?.employeeId;
      const name = u.displayName || u.name || "Faculty Member";
      const isAlreadyIncluded =
        (empId && existingFacultyEmpIds.has(empId)) ||
        existingFacultyNames.has(name.toLowerCase().trim());

      if (!isAlreadyIncluded) {
        mergedFaculties.push({
          id: u.id,
          campusId: id,
          name: name,
          designation: u.facultyDetails?.designation || u.headline || "Faculty Member",
          department: u.facultyDetails?.department || "Academic Faculty",
          category: u.facultyDetails?.category || "TEACHING",
          employeeId: empId || null,
          email: privMap.get(u.id) ?? null,
          phone: null,
          officeRoom: null,
          avatarUrl: u.avatarUrl,
          isActive: u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        } as (typeof campus.faculties)[number]);
      }
    }

    return NextResponse.json({
      campus: {
        ...campus,
        faculties: mergedFaculties,
      },
    });
  } catch (error) {
    console.error("Failed to fetch campus details:", error);
    return NextResponse.json({ error: "Failed to fetch campus details" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const parsed = UpdateCampusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await adminDb.campus.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, campus: updated });
  } catch (error) {
    console.error("Failed to update campus:", error);
    return NextResponse.json({ error: "Failed to update campus" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const updated = await adminDb.campus.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Campus deactivated", campus: updated });
  } catch (error) {
    console.error("Failed to deactivate campus:", error);
    return NextResponse.json({ error: "Failed to deactivate campus" }, { status: 500 });
  }
}
