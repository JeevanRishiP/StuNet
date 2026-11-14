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
  section: z.string().max(50).optional().nullable(),
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
        alumniDetails: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const userIds = identities.map((u) => u.id);
    const [privateDetails, campusBatches] = await Promise.all([
      userIds.length > 0
        ? enrollmentDb.userPrivateDetails.findMany({
            where: { userId: { in: userIds } },
            select: {
              userId: true,
              email: true,
              personalEmail: true,
              professionalEmail: true,
              whatsappNumber: true,
            },
          })
        : [],
      enrollmentDb.campusBatch.findMany({
        where: targetCampusId ? { campusId: targetCampusId } : {},
        select: { campusId: true, year: true, currentYear: true, currentSemester: true },
      }),
    ]);

    const batchStandingMap = new Map<
      string,
      { currentYear: number | null; currentSemester: number | null }
    >();
    for (const b of campusBatches) {
      batchStandingMap.set(`${b.campusId}_${b.year}`, {
        currentYear: b.currentYear,
        currentSemester: b.currentSemester,
      });
    }

    const privMap = new Map(privateDetails.map((p) => [p.userId, p]));

    const students = identities.map((u) => {
      const priv = privMap.get(u.id);
      const batchStanding =
        u.campusId && u.joiningYear ? batchStandingMap.get(`${u.campusId}_${u.joiningYear}`) : null;
      const selfCalculatedYear = u.joiningYear
        ? (calculateAcademicYear(u.joiningYear)?.yearNumber ??
          Math.max(1, Math.min(4, new Date().getFullYear() - u.joiningYear + 1)))
        : null;
      const resolvedCourseYear =
        batchStanding?.currentYear ??
        u.studentAcademicDetails?.currentCourseYear ??
        selfCalculatedYear ??
        null;

      return {
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
        section: u.section,
        academicYear: calculateAcademicYear(u.joiningYear),
        usn: u.studentAcademicDetails?.usn ?? u.alumniDetails?.usn ?? null,
        currentCourseYear: resolvedCourseYear,
        graduationYear:
          u.studentAcademicDetails?.graduationYear ?? u.alumniDetails?.graduationYear ?? null,
        degree: u.alumniDetails?.degree ?? null,
        company: u.alumniDetails?.company ?? null,
        designation: u.facultyDetails?.designation ?? u.alumniDetails?.designation ?? null,
        location: u.alumniDetails?.location ?? null,
        employeeId: u.facultyDetails?.employeeId ?? null,
        department: u.facultyDetails?.department ?? null,
        category: u.facultyDetails?.category ?? null,
        email: priv?.email ?? null,
        personalEmail: priv?.personalEmail ?? null,
        professionalEmail: priv?.professionalEmail ?? null,
        whatsappNumber: priv?.whatsappNumber ?? null,
        isActive: u.isActive,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
      };
    });

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
            section: s.section?.trim() || null,
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

        let studentCurrentYear: number | null = s.currentCourseYear || null;
        let studentCurrentSem: number | null = null;
        if (role === "STUDENT") {
          if (targetCampusId && jYear) {
            const batch = await enrollmentDb.campusBatch.findUnique({
              where: { campusId_year: { campusId: targetCampusId, year: jYear } },
              select: { currentYear: true, currentSemester: true },
            });
            if (batch?.currentYear) {
              studentCurrentYear = batch.currentYear;
              studentCurrentSem = batch.currentSemester ?? studentCurrentYear * 2 - 1;
            }
          }
          if (!studentCurrentYear && jYear) {
            const acad = calculateAcademicYear(jYear);
            studentCurrentYear =
              acad?.yearNumber ?? Math.max(1, Math.min(4, new Date().getFullYear() - jYear + 1));
            studentCurrentSem = studentCurrentYear ? studentCurrentYear * 2 - 1 : 1;
          }
          if (!studentCurrentYear) {
            studentCurrentYear = 1;
            studentCurrentSem = 1;
          }

          await enrollmentDb.studentAcademicDetails.create({
            data: {
              userId: newUser.id,
              usn: s.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
              currentCourseYear: studentCurrentYear,
              currentSemester: studentCurrentSem,
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
              currentCourseYear: role === "STUDENT" ? studentCurrentYear : null,
              currentSemester: role === "STUDENT" ? studentCurrentSem : null,
              joinedYear: jYear,
              graduationYear: s.graduationYear || null,
              isClaimed: true,
              createdByAdminId: session.userId,
            },
            update: {
              isClaimed: true,
              campusId: targetCampusId,
              role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
              ...(role === "STUDENT" && studentCurrentYear
                ? { currentCourseYear: studentCurrentYear, currentSemester: studentCurrentSem }
                : {}),
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
        section: parsed.data.section?.trim() || null,
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

    let resolvedSingleYear: number | null = parsed.data.currentCourseYear || null;
    let resolvedSingleSem: number | null = null;

    if (role === "STUDENT") {
      if (targetCampusId && memberJoiningYear) {
        const batch = await enrollmentDb.campusBatch.findUnique({
          where: { campusId_year: { campusId: targetCampusId, year: memberJoiningYear } },
          select: { currentYear: true, currentSemester: true },
        });
        if (batch?.currentYear) {
          resolvedSingleYear = batch.currentYear;
          resolvedSingleSem = batch.currentSemester ?? resolvedSingleYear * 2 - 1;
        }
      }
      if (!resolvedSingleYear && memberJoiningYear) {
        const acad = calculateAcademicYear(memberJoiningYear);
        resolvedSingleYear =
          acad?.yearNumber ??
          Math.max(1, Math.min(4, new Date().getFullYear() - memberJoiningYear + 1));
        resolvedSingleSem = resolvedSingleYear ? resolvedSingleYear * 2 - 1 : 1;
      }
      if (!resolvedSingleYear) {
        resolvedSingleYear = 1;
        resolvedSingleSem = 1;
      }

      await enrollmentDb.studentAcademicDetails.create({
        data: {
          userId: newMember.id,
          usn: parsed.data.usn?.trim() || `USN_${normalizedUsername.toUpperCase()}`,
          currentCourseYear: resolvedSingleYear,
          currentSemester: resolvedSingleSem,
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
          section: parsed.data.section?.trim() || null,
          currentCourseYear: role === "STUDENT" ? resolvedSingleYear : null,
          currentSemester: role === "STUDENT" ? resolvedSingleSem : null,
          joinedYear: memberJoiningYear,
          graduationYear: parsed.data.graduationYear || null,
          isClaimed: true,
          createdByAdminId: session.userId,
        },
        update: {
          isClaimed: true,
          campusId: targetCampusId,
          role: role === "FACULTY" ? "FACULTY" : role === "ALUMNI" ? "ALUMNI" : "STUDENT",
          ...(role === "STUDENT" && resolvedSingleYear
            ? { currentCourseYear: resolvedSingleYear, currentSemester: resolvedSingleSem }
            : {}),
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

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();
    const id = body.id as string;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const existingUser = await enrollmentDb.userIdentity.findUnique({
      where: { id },
      include: {
        studentAcademicDetails: true,
        facultyDetails: true,
        alumniDetails: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER") {
      if (existingUser.campusId !== session.managedCampusId) {
        return NextResponse.json(
          { error: "Forbidden: You cannot modify users outside your campus." },
          { status: 403 },
        );
      }
    }

    const targetCampusId =
      session.role === "CAMPUS_MANAGER"
        ? session.managedCampusId
        : body.campusId !== undefined
          ? body.campusId || null
          : existingUser.campusId;

    // Check username uniqueness if changed
    const username = body.username ? String(body.username).trim() : existingUser.username;
    if (username !== existingUser.username) {
      const clash = await enrollmentDb.userIdentity.findUnique({ where: { username } });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: `Username @${username} is already taken.` },
          { status: 409 },
        );
      }
    }

    // Check email uniqueness if changed
    const normalizedEmail = body.email ? String(body.email).toLowerCase().trim() : undefined;
    if (normalizedEmail) {
      const emailClash = await enrollmentDb.userPrivateDetails.findUnique({
        where: { email: normalizedEmail },
      });
      if (emailClash && emailClash.userId !== id) {
        return NextResponse.json(
          { error: `Email address ${normalizedEmail} is already registered.` },
          { status: 409 },
        );
      }
    }

    const joiningYear =
      body.joiningYear !== undefined
        ? body.joiningYear
          ? Number(body.joiningYear)
          : null
        : existingUser.joiningYear;

    const section =
      body.section !== undefined
        ? body.section
          ? String(body.section).trim()
          : null
        : existingUser.section;

    const role = (body.role as UserRole) || existingUser.role;

    // Update userIdentity
    const updatedUser = await enrollmentDb.userIdentity.update({
      where: { id },
      data: {
        displayName: body.displayName ? String(body.displayName).trim() : existingUser.displayName,
        username,
        role,
        campusId: targetCampusId,
        headline:
          body.headline !== undefined
            ? body.headline
              ? String(body.headline).trim()
              : null
            : existingUser.headline,
        joiningYear,
        section,
      },
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
    });

    // Update userPrivateDetails
    if (
      normalizedEmail ||
      body.personalEmail !== undefined ||
      body.professionalEmail !== undefined ||
      body.whatsappNumber !== undefined
    ) {
      await enrollmentDb.userPrivateDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          email: normalizedEmail || `${username}@campus.local`,
          personalEmail: body.personalEmail ? String(body.personalEmail).trim() : null,
          professionalEmail: body.professionalEmail ? String(body.professionalEmail).trim() : null,
          whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber).trim() : null,
        },
        update: {
          ...(normalizedEmail ? { email: normalizedEmail } : {}),
          ...(body.personalEmail !== undefined
            ? { personalEmail: body.personalEmail ? String(body.personalEmail).trim() : null }
            : {}),
          ...(body.professionalEmail !== undefined
            ? {
                professionalEmail: body.professionalEmail
                  ? String(body.professionalEmail).trim()
                  : null,
              }
            : {}),
          ...(body.whatsappNumber !== undefined
            ? { whatsappNumber: body.whatsappNumber ? String(body.whatsappNumber).trim() : null }
            : {}),
        },
      });
    }

    // Role-specific records
    if (role === "STUDENT" || role === "CLUB_MANAGER") {
      const usn = body.usn
        ? String(body.usn).trim()
        : existingUser.studentAcademicDetails?.usn || username;
      const effectiveJoiningYear = joiningYear ?? existingUser.joiningYear;

      let resolvedCourseYear: number | null = null;
      let resolvedCourseSem: number | null = null;

      // 1. Authoritative batch standing takes precedence
      if (targetCampusId && effectiveJoiningYear) {
        const batch = await enrollmentDb.campusBatch.findUnique({
          where: { campusId_year: { campusId: targetCampusId, year: effectiveJoiningYear } },
          select: { currentYear: true, currentSemester: true },
        });
        if (batch?.currentYear) {
          resolvedCourseYear = batch.currentYear;
          resolvedCourseSem = batch.currentSemester ?? resolvedCourseYear * 2 - 1;
        }
      }

      // 2. Self-calculate progression if batch doesn't specify
      if (!resolvedCourseYear && effectiveJoiningYear) {
        const acad = calculateAcademicYear(effectiveJoiningYear);
        resolvedCourseYear =
          acad?.yearNumber ??
          Math.max(1, Math.min(4, new Date().getFullYear() - effectiveJoiningYear + 1));
        resolvedCourseSem = resolvedCourseYear ? resolvedCourseYear * 2 - 1 : 1;
      }

      if (!resolvedCourseYear) {
        resolvedCourseYear = existingUser.studentAcademicDetails?.currentCourseYear || 1;
        resolvedCourseSem = existingUser.studentAcademicDetails?.currentSemester || 1;
      }

      const graduationYear = body.graduationYear
        ? Number(body.graduationYear)
        : existingUser.studentAcademicDetails?.graduationYear ||
          (effectiveJoiningYear ? effectiveJoiningYear + 4 : new Date().getFullYear() + 4);

      await enrollmentDb.studentAcademicDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          usn,
          currentCourseYear: resolvedCourseYear,
          currentSemester: resolvedCourseSem,
          joinedYear: effectiveJoiningYear,
          graduationYear,
        },
        update: {
          usn,
          currentCourseYear: resolvedCourseYear,
          currentSemester: resolvedCourseSem,
          joinedYear: effectiveJoiningYear,
          graduationYear,
        },
      });

      if (targetCampusId && (normalizedEmail || existingUser.id)) {
        const rosterEmail =
          normalizedEmail ||
          (await enrollmentDb.userPrivateDetails.findUnique({ where: { userId: id } }))?.email;
        if (rosterEmail) {
          await enrollmentDb.institutionalRoster.upsert({
            where: { email: rosterEmail },
            create: {
              email: rosterEmail,
              role: "STUDENT",
              identifier: usn,
              campusId: targetCampusId,
              section,
              currentCourseYear: resolvedCourseYear,
              currentSemester: resolvedCourseSem,
              joinedYear: effectiveJoiningYear,
              graduationYear,
              isClaimed: true,
              createdByAdminId: session.userId,
            },
            update: {
              role: "STUDENT",
              identifier: usn,
              campusId: targetCampusId,
              section,
              currentCourseYear: resolvedCourseYear,
              currentSemester: resolvedCourseSem,
              joinedYear: effectiveJoiningYear,
              graduationYear,
            },
          });
        }
      }
    } else if (role === "FACULTY") {
      const employeeId = body.employeeId
        ? String(body.employeeId).trim()
        : existingUser.facultyDetails?.employeeId || username;
      const department =
        body.department !== undefined
          ? body.department
            ? String(body.department).trim()
            : null
          : existingUser.facultyDetails?.department;
      const designation =
        body.designation !== undefined
          ? body.designation
            ? String(body.designation).trim()
            : null
          : existingUser.facultyDetails?.designation;
      const category = body.category
        ? String(body.category).trim()
        : existingUser.facultyDetails?.category || "TEACHING";

      await enrollmentDb.facultyDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          employeeId,
          department,
          designation,
          category,
        },
        update: {
          employeeId,
          department,
          designation,
          category,
        },
      });

      if (targetCampusId) {
        const rosterEmail =
          normalizedEmail ||
          (await enrollmentDb.userPrivateDetails.findUnique({ where: { userId: id } }))?.email;
        if (rosterEmail) {
          await enrollmentDb.institutionalRoster.upsert({
            where: { email: rosterEmail },
            create: {
              email: rosterEmail,
              role: "FACULTY",
              identifier: employeeId,
              campusId: targetCampusId,
              isClaimed: true,
              createdByAdminId: session.userId,
            },
            update: {
              role: "FACULTY",
              identifier: employeeId,
              campusId: targetCampusId,
            },
          });
        }
      }
    } else if (role === "ALUMNI") {
      const usn = body.usn ? String(body.usn).trim() : existingUser.alumniDetails?.usn || null;
      const graduationYear = body.graduationYear
        ? Number(body.graduationYear)
        : existingUser.alumniDetails?.graduationYear || new Date().getFullYear();
      const degree =
        body.degree !== undefined
          ? body.degree
            ? String(body.degree).trim()
            : null
          : existingUser.alumniDetails?.degree;
      const company =
        body.company !== undefined
          ? body.company
            ? String(body.company).trim()
            : null
          : existingUser.alumniDetails?.company;
      const designation =
        body.designation !== undefined
          ? body.designation
            ? String(body.designation).trim()
            : null
          : existingUser.alumniDetails?.designation;
      const location =
        body.location !== undefined
          ? body.location
            ? String(body.location).trim()
            : null
          : existingUser.alumniDetails?.location;

      await enrollmentDb.alumniDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          usn,
          joinedYear: joiningYear,
          graduationYear,
          degree,
          company,
          designation,
          location,
        },
        update: {
          usn,
          joinedYear: joiningYear,
          graduationYear,
          degree,
          company,
          designation,
          location,
        },
      });
    }

    // Profile links if provided
    if (body.profileLinks && typeof body.profileLinks === "object") {
      const links = body.profileLinks as Record<string, string>;
      for (const [key, url] of Object.entries(links)) {
        const platform = VALID_PLATFORMS[key.toLowerCase()];
        if (platform && url && url.trim()) {
          await enrollmentDb.profileLink.upsert({
            where: { userId_platform: { userId: id, platform } },
            create: { userId: id, platform, url: url.trim() },
            update: { url: url.trim() },
          });
        }
      }
    }

    // Audit log
    await enrollmentDb.adminAuditLog.create({
      data: {
        adminId: session.userId,
        action: "UPDATE_USER_DETAILS",
        targetType: "UserIdentity",
        targetId: id,
        metaJson: {
          updatedRole: role,
          displayName: updatedUser.displayName,
          username: updatedUser.username,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `User @${updatedUser.username} details updated successfully.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error("PATCH /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to update member details", detail: String(err) },
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
