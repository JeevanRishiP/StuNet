/**
 * GET  /api/dev/users?page=1&limit=20&role=&status=&q=
 * POST /api/dev/users — create user with full student/faculty/alumni details
 * PATCH /api/dev/users — update user by id in body
 * DELETE /api/dev/users?id= — delete user
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";
import { calculateAcademicYear } from "@stunet/types";
import { ProfilePlatform, UserRole, VerificationStatus } from "@prisma/client";

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

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const role = searchParams.get("role") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const where = {
    ...(role ? { role: role as UserRole } : {}),
    ...(status ? { verificationStatus: status as VerificationStatus } : {}),
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" as const } },
            { username: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    devDb.userIdentity.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        campus: { select: { id: true, name: true, slug: true } },
        managedCampus: { select: { id: true, name: true, slug: true } },
        studentAcademicDetails: true,
        facultyDetails: true,
        alumniDetails: true,
        profileLinks: true,
        _count: { select: { posts: true, sentConnections: true, achievements: true } },
      },
    }),
    devDb.userIdentity.count({ where }),
  ]);

  // Also fetch user private details for emails & contact info
  const userIds = users.map((u) => u.id);
  const privateDetails = await devDb.userPrivateDetails.findMany({
    where: { userId: { in: userIds } },
  });
  const privateMap = new Map(privateDetails.map((p) => [p.userId, p]));

  const mapped = users.map((u) => {
    const isGuest = u.role === "GUEST" || u.username === "guest";
    const priv = isGuest ? null : privateMap.get(u.id);
    return {
      ...u,
      displayName: isGuest ? "Guest" : u.displayName,
      username: isGuest ? "guest" : u.username,
      email: isGuest ? null : (priv?.email ?? null),
      personalEmail: isGuest ? null : (priv?.personalEmail ?? null),
      professionalEmail: isGuest ? null : (priv?.professionalEmail ?? null),
      whatsappNumber: isGuest ? null : (priv?.whatsappNumber ?? null),
      academicYear: isGuest ? null : calculateAcademicYear(u.joiningYear),
      _count: {
        posts: u._count.posts,
        connections: u._count.sentConnections,
        achievements: u._count.achievements,
      },
    };
  });

  return NextResponse.json({ users: mapped, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const role = (body.role as UserRole) ?? "STUDENT";
    const verificationStatus = (body.verificationStatus as VerificationStatus) ?? "VERIFIED";
    const joiningYear = body.joiningYear ? Number(body.joiningYear) : null;
    const section = (body.section as string)?.trim() || null;
    const campusId = (body.campusId as string | null) || null;
    const username = (body.username as string)?.trim() || `user_${Date.now()}`;
    const displayName = (body.displayName as string)?.trim() || username;

    const user = await devDb.userIdentity.create({
      data: {
        displayName,
        username,
        role,
        verificationStatus,
        campusId,
        managedCampusId: (body.managedCampusId as string | null) ?? null,
        headline: (body.headline as string | null) ?? null,
        bio: (body.bio as string | null) ?? null,
        avatarUrl: (body.avatarUrl as string | null) ?? null,
        joiningYear,
        section,
      },
    });

    // Handle Private Details (Emails & WhatsApp)
    const email = (body.email as string)?.trim() || `${username}@stunet.local`;
    const personalEmail = (body.personalEmail as string)?.trim() || null;
    const professionalEmail = (body.professionalEmail as string)?.trim() || null;
    const whatsappNumber = (body.whatsappNumber as string)?.trim() || null;

    await devDb.userPrivateDetails.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email,
        personalEmail,
        professionalEmail,
        whatsappNumber,
      },
      update: {
        email,
        personalEmail,
        professionalEmail,
        whatsappNumber,
      },
    });

    // Handle Role-Specific Details
    if (role === "STUDENT") {
      const usn = (body.usn as string)?.trim() || username;
      const currentCourseYear = body.currentCourseYear ? Number(body.currentCourseYear) : null;
      const graduationYear = body.graduationYear ? Number(body.graduationYear) : null;

      await devDb.studentAcademicDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          usn,
          currentCourseYear,
          joinedYear: joiningYear,
          graduationYear,
        },
        update: {
          usn,
          currentCourseYear,
          joinedYear: joiningYear,
          graduationYear,
        },
      });

      if (campusId) {
        await devDb.institutionalRoster.upsert({
          where: { email },
          create: {
            email,
            role: "STUDENT",
            identifier: usn,
            campusId,
            currentCourseYear,
            joinedYear: joiningYear,
            graduationYear,
            isClaimed: true,
            createdByAdminId: "dev-portal",
          },
          update: {
            role: "STUDENT",
            identifier: usn,
            campusId,
            currentCourseYear,
            joinedYear: joiningYear,
            graduationYear,
          },
        });
      }
    } else if (role === "FACULTY") {
      const employeeId = (body.employeeId as string)?.trim() || username;
      const department = (body.department as string)?.trim() || null;
      const designation = (body.designation as string)?.trim() || null;
      const category = (body.category as string)?.trim() || "TEACHING";

      await devDb.facultyDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
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

      if (campusId) {
        await devDb.institutionalRoster.upsert({
          where: { email },
          create: {
            email,
            role: "FACULTY",
            identifier: employeeId,
            campusId,
            isClaimed: true,
            createdByAdminId: "dev-portal",
          },
          update: {
            role: "FACULTY",
            identifier: employeeId,
            campusId,
          },
        });
      }
    } else if (role === "ALUMNI") {
      const usn = (body.usn as string)?.trim() || null;
      const graduationYear = Number(body.graduationYear) || new Date().getFullYear();
      const degree = (body.degree as string)?.trim() || null;
      const company = (body.company as string)?.trim() || null;
      const designation = (body.designation as string)?.trim() || null;
      const location = (body.location as string)?.trim() || null;

      await devDb.alumniDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
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

      if (campusId) {
        await devDb.institutionalRoster.upsert({
          where: { email },
          create: {
            email,
            role: "ALUMNI",
            identifier: usn || username,
            campusId,
            joinedYear: joiningYear,
            graduationYear,
            isClaimed: true,
            createdByAdminId: "dev-portal",
          },
          update: {
            role: "ALUMNI",
            identifier: usn || username,
            campusId,
            joinedYear: joiningYear,
            graduationYear,
          },
        });
      }
    }

    // Handle Profile Links
    if (body.profileLinks && typeof body.profileLinks === "object") {
      const links = body.profileLinks as Record<string, string>;
      for (const [key, url] of Object.entries(links)) {
        const platform = VALID_PLATFORMS[key.toLowerCase()];
        if (platform && url && url.trim()) {
          await devDb.profileLink.upsert({
            where: { userId_platform: { userId: user.id, platform } },
            create: { userId: user.id, platform, url: url.trim() },
            update: { url: url.trim() },
          });
        }
      }
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.displayName !== undefined) data.displayName = body.displayName;
  if (body.username !== undefined) data.username = body.username;
  if (body.role !== undefined) data.role = body.role;
  if (body.verificationStatus !== undefined) data.verificationStatus = body.verificationStatus;
  if (body.campusId !== undefined) data.campusId = body.campusId || null;
  if (body.managedCampusId !== undefined) data.managedCampusId = body.managedCampusId || null;
  if (body.headline !== undefined) data.headline = body.headline || null;
  if (body.bio !== undefined) data.bio = body.bio || null;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl || null;
  if (body.joiningYear !== undefined) {
    data.joiningYear = body.joiningYear ? Number(body.joiningYear) : null;
  }
  if (body.section !== undefined) {
    data.section = (body.section as string)?.trim() || null;
  }
  if (body.isBanned !== undefined) {
    data.isBanned = Boolean(body.isBanned);
    data.bannedAt = body.isBanned ? new Date() : null;
    if (body.bannedReason !== undefined) data.bannedReason = body.bannedReason || null;
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  try {
    const user = await devDb.userIdentity.update({
      where: { id },
      data,
    });

    // Handle updates to emails & contact if provided
    if (
      body.email !== undefined ||
      body.personalEmail !== undefined ||
      body.professionalEmail !== undefined ||
      body.whatsappNumber !== undefined
    ) {
      const isGuest = user.role === "GUEST" || user.username === "guest";
      const sanitizedEmail = isGuest
        ? "guest@stunet.internal"
        : (body.email as string)?.trim() || `${user.username}@stunet.local`;
      await devDb.userPrivateDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          email: sanitizedEmail,
          personalEmail: isGuest ? null : (body.personalEmail as string)?.trim() || null,
          professionalEmail: isGuest ? null : (body.professionalEmail as string)?.trim() || null,
          whatsappNumber: isGuest ? null : (body.whatsappNumber as string)?.trim() || null,
        },
        update: {
          ...(body.email !== undefined && !isGuest && (body.email as string).trim()
            ? { email: (body.email as string).trim() }
            : {}),
          ...(body.personalEmail !== undefined
            ? { personalEmail: isGuest ? null : (body.personalEmail as string).trim() || null }
            : {}),
          ...(body.professionalEmail !== undefined
            ? {
                professionalEmail: isGuest
                  ? null
                  : (body.professionalEmail as string).trim() || null,
              }
            : {}),
          ...(body.whatsappNumber !== undefined
            ? { whatsappNumber: isGuest ? null : (body.whatsappNumber as string).trim() || null }
            : {}),
        },
      });
    }

    // Role specific detail updates
    if (
      user.role === "STUDENT" &&
      (body.usn !== undefined ||
        body.currentCourseYear !== undefined ||
        body.graduationYear !== undefined)
    ) {
      await devDb.studentAcademicDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          usn: (body.usn as string)?.trim() || user.username || id,
          currentCourseYear: body.currentCourseYear ? Number(body.currentCourseYear) : null,
          joinedYear: user.joiningYear,
          graduationYear: body.graduationYear ? Number(body.graduationYear) : null,
        },
        update: {
          ...(body.usn !== undefined ? { usn: (body.usn as string).trim() } : {}),
          ...(body.currentCourseYear !== undefined
            ? { currentCourseYear: Number(body.currentCourseYear) || null }
            : {}),
          ...(body.graduationYear !== undefined
            ? { graduationYear: Number(body.graduationYear) || null }
            : {}),
        },
      });
    } else if (
      user.role === "FACULTY" &&
      (body.employeeId !== undefined ||
        body.department !== undefined ||
        body.designation !== undefined ||
        body.category !== undefined)
    ) {
      await devDb.facultyDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          employeeId: (body.employeeId as string)?.trim() || user.username || id,
          department: (body.department as string)?.trim() || null,
          designation: (body.designation as string)?.trim() || null,
          category: (body.category as string)?.trim() || "TEACHING",
        },
        update: {
          ...(body.employeeId !== undefined
            ? { employeeId: (body.employeeId as string).trim() }
            : {}),
          ...(body.department !== undefined
            ? { department: (body.department as string).trim() || null }
            : {}),
          ...(body.designation !== undefined
            ? { designation: (body.designation as string).trim() || null }
            : {}),
          ...(body.category !== undefined
            ? { category: (body.category as string).trim() || "TEACHING" }
            : {}),
        },
      });
    } else if (
      user.role === "ALUMNI" &&
      (body.graduationYear !== undefined ||
        body.degree !== undefined ||
        body.company !== undefined ||
        body.designation !== undefined)
    ) {
      await devDb.alumniDetails.upsert({
        where: { userId: id },
        create: {
          userId: id,
          usn: (body.usn as string)?.trim() || null,
          joinedYear: user.joiningYear,
          graduationYear: Number(body.graduationYear) || new Date().getFullYear(),
          degree: (body.degree as string)?.trim() || null,
          company: (body.company as string)?.trim() || null,
          designation: (body.designation as string)?.trim() || null,
          location: (body.location as string)?.trim() || null,
        },
        update: {
          ...(body.usn !== undefined ? { usn: (body.usn as string).trim() || null } : {}),
          ...(body.graduationYear !== undefined
            ? { graduationYear: Number(body.graduationYear) }
            : {}),
          ...(body.degree !== undefined ? { degree: (body.degree as string).trim() || null } : {}),
          ...(body.company !== undefined
            ? { company: (body.company as string).trim() || null }
            : {}),
          ...(body.designation !== undefined
            ? { designation: (body.designation as string).trim() || null }
            : {}),
          ...(body.location !== undefined
            ? { location: (body.location as string).trim() || null }
            : {}),
        },
      });
    }

    // Profile links update
    if (body.profileLinks && typeof body.profileLinks === "object") {
      const links = body.profileLinks as Record<string, string>;
      for (const [key, url] of Object.entries(links)) {
        const platform = VALID_PLATFORMS[key.toLowerCase()];
        if (platform && url !== undefined) {
          if (url && url.trim()) {
            await devDb.profileLink.upsert({
              where: { userId_platform: { userId: id, platform } },
              create: { userId: id, platform, url: url.trim() },
              update: { url: url.trim() },
            });
          } else {
            await devDb.profileLink.deleteMany({
              where: { userId: id, platform },
            });
          }
        }
      }
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.userIdentity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
