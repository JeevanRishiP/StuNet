/**
 * /api/directory/enroll
 *
 * Endpoint for Super Admin and Campus Managers to enroll and verify members
 * (Students, Alumni, and Faculty) under campus scope.
 *
 * GET  — List enrolled users (STUDENT, ALUMNI, FACULTY, GUEST) with details
 * POST — Enroll single or bulk members (Students, Alumni, Faculty) with immediate VERIFIED status
 * DELETE — Revoke enrollment (convert to GUEST)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, assertCampusScope } from "@/lib/rbac";
import { enrollmentDb } from "@/lib/enrollmentDb";
import { ProfilePlatform, UserRole } from "@prisma/client";
import { calculateAcademicYear } from "@stunet/types";
import { z } from "zod";

const VALID_PLATFORMS: Record<string, ProfilePlatform> = {
  linktree: ProfilePlatform.LINKTREE,
  portfolio: ProfilePlatform.PORTFOLIO,
  instagram: ProfilePlatform.INSTAGRAM,
  youtube: ProfilePlatform.YOUTUBE,
  twitter: ProfilePlatform.TWITTER,
  threads: ProfilePlatform.THREADS,
  linkedin: ProfilePlatform.LINKEDIN,
  github: ProfilePlatform.GITHUB,
  huggingface: ProfilePlatform.HUGGINGFACE,
  leetcode: ProfilePlatform.LEETCODE,
  hackerrank: ProfilePlatform.HACKERRANK,
  codeforces: ProfilePlatform.CODEFORCES,
  kaggle: ProfilePlatform.KAGGLE,
};

const EnrollMemberSchema = z.object({
  role: z.enum(["STUDENT", "ALUMNI", "FACULTY"]).default("STUDENT"),
  email: z.string().email().max(254),
  personalEmail: z.string().email().max(254).optional().nullable().or(z.literal("")),
  professionalEmail: z.string().email().max(254).optional().nullable().or(z.literal("")),
  whatsappNumber: z.string().max(20).optional().nullable().or(z.literal("")),
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain alphanumeric characters, underscores, and dashes",
    ),
  displayName: z.string().min(2).max(60).trim(),
  headline: z.string().max(120).optional().nullable(),
  joiningYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  campusId: z.string().optional().nullable(),
  // Student & Alumni fields
  usn: z.string().max(100).optional().nullable(),
  currentCourseYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2150).optional().nullable(),
  degree: z.string().max(200).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  // Faculty fields
  employeeId: z.string().max(100).optional().nullable(),
  department: z.string().max(150).optional().nullable(),
  designation: z.string().max(150).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  // Profile links
  profileLinks: z.record(z.string()).optional().nullable(),
});

const BulkEnrollSchema = z.object({
  role: z.enum(["STUDENT", "ALUMNI", "FACULTY"]).default("STUDENT"),
  students: z.array(EnrollMemberSchema).min(1).max(200),
  campusId: z.string().optional().nullable(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const campusParam = searchParams.get("campus");
  const roleParam = searchParams.get("role");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "1000", 10) || 1000, 5000);

  const targetCampusId =
    session.role === "CAMPUS_MANAGER" ? session.managedCampusId : campusParam || undefined;

  if (session.role === "CAMPUS_MANAGER" && !targetCampusId) {
    return NextResponse.json({ error: "Campus manager has no assigned campus" }, { status: 400 });
  }

  try {
    const rolesFilter =
      roleParam && roleParam !== "ALL"
        ? roleParam === "STUDENT"
          ? ["STUDENT", "CLUB_MANAGER"]
          : [roleParam as "STUDENT" | "ALUMNI" | "FACULTY" | "GUEST" | "CLUB_MANAGER"]
        : ["STUDENT", "ALUMNI", "FACULTY", "CLUB_MANAGER", "GUEST"];

    const identities = await enrollmentDb.userIdentity.findMany({
      where: {
        ...(targetCampusId ? { campusId: targetCampusId } : {}),
        role: { in: rolesFilter as UserRole[] },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        campus: { select: { id: true, name: true, city: true } },
        studentAcademicDetails: true,
        facultyDetails: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = identities.map((u) => u.id);
    const privateDetails =
      userIds.length > 0
        ? await enrollmentDb.userPrivateDetails.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, email: true },
          })
        : [];

    const privMap = new Map(privateDetails.map((p) => [p.userId, p.email]));

    const students = identities.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      headline: u.headline,
      role: u.role,
      verificationStatus: u.verificationStatus,
      campusId: u.campusId,
      campusName: u.campus?.name ?? "Unassigned",
      campusCity: u.campus?.city ?? "",
      joiningYear: u.joiningYear,
      academicYear: calculateAcademicYear(u.joiningYear),
      usn: u.studentAcademicDetails?.usn ?? null,
      currentCourseYear: u.studentAcademicDetails?.currentCourseYear ?? null,
      graduationYear: u.studentAcademicDetails?.graduationYear ?? null,
      employeeId: u.facultyDetails?.employeeId ?? null,
      email: privMap.get(u.id) ?? null,
      isActive: u.isActive,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
    }));

    // Persistent total breakdown counts for this campus scope
    const [totalStudents, totalAlumni, totalFaculty, totalGuests] = await Promise.all([
      enrollmentDb.userIdentity.count({
        where: {
          ...(targetCampusId ? { campusId: targetCampusId } : {}),
          role: { in: ["STUDENT", "CLUB_MANAGER"] },
        },
      }),
      enrollmentDb.userIdentity.count({
        where: {
          ...(targetCampusId ? { campusId: targetCampusId } : {}),
          role: "ALUMNI",
        },
      }),
      enrollmentDb.userIdentity.count({
        where: {
          ...(targetCampusId ? { campusId: targetCampusId } : {}),
          role: "FACULTY",
        },
      }),
      enrollmentDb.userIdentity.count({
        where: {
          ...(targetCampusId ? { campusId: targetCampusId } : {}),
          role: "GUEST",
        },
      }),
    ]);

    const counts = {
      total: totalStudents + totalAlumni + totalFaculty + totalGuests,
      students: totalStudents,
      alumni: totalAlumni,
      faculty: totalFaculty,
      guest: totalGuests,
    };

    return NextResponse.json({ students, counts });
  } catch (err) {
    console.error("GET /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to fetch directory members", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();
    const isBulk = Array.isArray(body?.students);

    if (isBulk) {
      const parsed = BulkEnrollSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid roster data", details: parsed.error.format() },
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

      const results: Array<{
        email: string;
        username: string;
        status: "success" | "skipped";
        reason?: string;
      }> = [];

      for (const s of parsed.data.students) {
        const normalizedEmail = s.email.toLowerCase().trim();
        const normalizedUsername = s.username.toLowerCase().trim();

        const existingEmail = await enrollmentDb.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingEmail) {
          results.push({
            email: normalizedEmail,
            username: normalizedUsername,
            status: "skipped",
            reason: "Email already registered",
          });
          continue;
        }

        const existingUsername = await enrollmentDb.userIdentity.findUnique({
          where: { username: normalizedUsername },
        });

        if (existingUsername) {
          results.push({
            email: normalizedEmail,
            username: normalizedUsername,
            status: "skipped",
            reason: "Username already taken",
          });
          continue;
        }

        const currentSessionStartYear =
          new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const jYear = s.joiningYear ?? currentSessionStartYear;
        const role = s.role || parsed.data.role || "STUDENT";

        const newUser = await enrollmentDb.userIdentity.create({
          data: {
            displayName: s.displayName.trim(),
            username: normalizedUsername,
            role,
            verificationStatus: "VERIFIED",
            campusId: targetCampusId,
            headline: s.headline?.trim() || null,
            joiningYear: jYear,
            isActive: true,
            isBanned: false,
          },
        });

        await enrollmentDb.userPrivateDetails.create({
          data: {
            userId: newUser.id,
            email: normalizedEmail,
            personalEmail: s.personalEmail?.trim() || null,
            professionalEmail: s.professionalEmail?.trim() || null,
            whatsappNumber: s.whatsappNumber?.trim() || null,
          },
        });

        if (role === "STUDENT") {
          await enrollmentDb.studentAcademicDetails.create({
            data: {
              userId: newUser.id,
              usn: s.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
              currentCourseYear: s.currentCourseYear || null,
              joinedYear: jYear,
              graduationYear: s.graduationYear || jYear + 4,
            },
          });
        } else if (role === "ALUMNI") {
          await enrollmentDb.alumniDetails.create({
            data: {
              userId: newUser.id,
              usn: s.usn?.trim() || `ALUM_${normalizedUsername.toUpperCase()}`,
              joinedYear: jYear,
              graduationYear: s.graduationYear || jYear + 4,
              degree: s.degree?.trim() || null,
              company: s.company?.trim() || null,
              designation: s.designation?.trim() || null,
              location: s.location?.trim() || null,
            },
          });
        } else if (role === "FACULTY") {
          const empId = s.employeeId?.trim() || `FAC_${normalizedUsername.toUpperCase()}`;
          await enrollmentDb.facultyDetails.create({
            data: {
              userId: newUser.id,
              employeeId: empId,
              department: s.department?.trim() || null,
              designation: s.designation?.trim() || null,
              category: s.category?.trim() || "TEACHING",
            },
          });
          if (targetCampusId) {
            await enrollmentDb.campusFaculty
              .create({
                data: {
                  campusId: targetCampusId,
                  name: newUser.displayName,
                  designation: s.designation?.trim() || "Faculty Member",
                  department: s.department?.trim() || "Academic Faculty",
                  category: s.category?.trim() || "TEACHING",
                  employeeId: empId,
                  email: normalizedEmail,
                  isActive: true,
                },
              })
              .catch(() => null);
          }
        }

        if (s.profileLinks && typeof s.profileLinks === "object") {
          for (const [key, url] of Object.entries(s.profileLinks)) {
            const platform = VALID_PLATFORMS[key.toLowerCase()];
            if (platform && url && typeof url === "string" && url.trim()) {
              await enrollmentDb.profileLink.upsert({
                where: { userId_platform: { userId: newUser.id, platform } },
                create: { userId: newUser.id, platform, url: url.trim() },
                update: { url: url.trim() },
              });
            }
          }
        }

        // Roster consistency
        await enrollmentDb.institutionalRoster
          .upsert({
            where: { email: normalizedEmail },
            create: {
              email: normalizedEmail,
              role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
              identifier:
                role === "FACULTY"
                  ? s.employeeId?.trim() || `FAC_${normalizedUsername.toUpperCase()}`
                  : s.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
              campusId: targetCampusId,
              currentCourseYear: s.currentCourseYear || null,
              joinedYear: jYear,
              graduationYear: s.graduationYear || null,
              isClaimed: true,
              createdByAdminId: session.userId,
            },
            update: {
              isClaimed: true,
              campusId: targetCampusId,
              role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
            },
          })
          .catch(() => null);

        results.push({ email: normalizedEmail, username: normalizedUsername, status: "success" });
      }

      const successCount = results.filter((r) => r.status === "success").length;
      return NextResponse.json({
        success: true,
        message: `Successfully enrolled and verified ${successCount} member(s).`,
        results,
      });
    }

    // Single enrollment
    const parsed = EnrollMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid form data", details: parsed.error.format() },
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

    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const normalizedUsername = parsed.data.username.toLowerCase().trim();
    const role = parsed.data.role;

    // Check unique email
    const existingEmail = await enrollmentDb.userPrivateDetails.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" is already enrolled or registered in StuNet.` },
        { status: 409 },
      );
    }

    // Check unique username
    const existingUsername = await enrollmentDb.userIdentity.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          error: `Username "@${normalizedUsername}" is already taken. Usernames must be unique.`,
        },
        { status: 409 },
      );
    }

    const currentSessionStartYear =
      new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const memberJoiningYear = parsed.data.joiningYear ?? currentSessionStartYear;

    // Create user identity with VERIFIED status
    const newMember = await enrollmentDb.userIdentity.create({
      data: {
        displayName: parsed.data.displayName.trim(),
        username: normalizedUsername,
        role,
        verificationStatus: "VERIFIED",
        campusId: targetCampusId,
        headline: parsed.data.headline?.trim() || null,
        joiningYear: memberJoiningYear,
        isActive: true,
        isBanned: false,
      },
    });

    // Create private details (Email, Personal Email, Professional Email, WhatsApp)
    await enrollmentDb.userPrivateDetails.create({
      data: {
        userId: newMember.id,
        email: normalizedEmail,
        personalEmail: parsed.data.personalEmail?.trim() || null,
        professionalEmail: parsed.data.professionalEmail?.trim() || null,
        whatsappNumber: parsed.data.whatsappNumber?.trim() || null,
      },
    });

    // Role-specific records
    if (role === "STUDENT") {
      await enrollmentDb.studentAcademicDetails.create({
        data: {
          userId: newMember.id,
          usn: parsed.data.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
          currentCourseYear: parsed.data.currentCourseYear || null,
          joinedYear: memberJoiningYear,
          graduationYear: parsed.data.graduationYear || memberJoiningYear + 4,
        },
      });
    } else if (role === "ALUMNI") {
      await enrollmentDb.alumniDetails.create({
        data: {
          userId: newMember.id,
          usn: parsed.data.usn?.trim() || `ALUM_${normalizedUsername.toUpperCase()}`,
          joinedYear: memberJoiningYear,
          graduationYear: parsed.data.graduationYear || memberJoiningYear + 4,
          degree: parsed.data.degree?.trim() || null,
          company: parsed.data.company?.trim() || null,
          designation: parsed.data.designation?.trim() || null,
          location: parsed.data.location?.trim() || null,
        },
      });
    } else if (role === "FACULTY") {
      const empId = parsed.data.employeeId?.trim() || `FAC_${normalizedUsername.toUpperCase()}`;
      await enrollmentDb.facultyDetails.create({
        data: {
          userId: newMember.id,
          employeeId: empId,
          department: parsed.data.department?.trim() || null,
          designation: parsed.data.designation?.trim() || null,
          category: parsed.data.category?.trim() || "TEACHING",
        },
      });
      if (targetCampusId) {
        await enrollmentDb.campusFaculty
          .create({
            data: {
              campusId: targetCampusId,
              name: newMember.displayName,
              designation: parsed.data.designation?.trim() || "Faculty Member",
              department: parsed.data.department?.trim() || "Academic Faculty",
              category: parsed.data.category?.trim() || "TEACHING",
              employeeId: empId,
              email: normalizedEmail,
              isActive: true,
            },
          })
          .catch(() => null);
      }
    }

    // Save profile links if provided
    if (parsed.data.profileLinks && typeof parsed.data.profileLinks === "object") {
      for (const [key, url] of Object.entries(parsed.data.profileLinks)) {
        const platform = VALID_PLATFORMS[key.toLowerCase()];
        if (platform && url && typeof url === "string" && url.trim()) {
          await enrollmentDb.profileLink.upsert({
            where: { userId_platform: { userId: newMember.id, platform } },
            create: { userId: newMember.id, platform, url: url.trim() },
            update: { url: url.trim() },
          });
        }
      }
    }

    // Ensure institutional roster consistency
    await enrollmentDb.institutionalRoster
      .upsert({
        where: { email: normalizedEmail },
        create: {
          email: normalizedEmail,
          role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
          identifier:
            role === "FACULTY"
              ? parsed.data.employeeId?.trim() || `FAC_${normalizedUsername.toUpperCase()}`
              : parsed.data.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
          campusId: targetCampusId,
          currentCourseYear: parsed.data.currentCourseYear || null,
          joinedYear: memberJoiningYear,
          graduationYear: parsed.data.graduationYear || null,
          isClaimed: true,
          createdByAdminId: session.userId,
        },
        update: {
          isClaimed: true,
          campusId: targetCampusId,
          role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
        },
      })
      .catch(() => null);

    const roleLabel =
      role === "STUDENT" ? "Student" : role === "ALUMNI" ? "Alumni" : "Faculty member";

    return NextResponse.json(
      {
        success: true,
        message: `Successfully created and verified ${roleLabel} "${newMember.displayName}" (@${newMember.username}) with email ${normalizedEmail}.`,
        member: {
          ...newMember,
          email: normalizedEmail,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to enroll member", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const student = await enrollmentDb.userIdentity.findUnique({
      where: { id: userId },
    });

    if (!student) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER" && student.campusId !== session.managedCampusId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify users outside your campus." },
        { status: 403 },
      );
    }

    // Un-enroll: set role to GUEST, remove campusId, set PENDING
    await enrollmentDb.userIdentity.update({
      where: { id: userId },
      data: {
        role: "GUEST",
        campusId: null,
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Revoked campus privileges for @${student.username}. User converted to Guest.`,
    });
  } catch (err) {
    console.error("DELETE /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to revoke enrollment", detail: String(err) },
      { status: 500 },
    );
  }
}
