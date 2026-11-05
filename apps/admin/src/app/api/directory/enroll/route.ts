/**
 * /api/directory/enroll
 *
 * Endpoint for Campus Managers to feed / enroll authorized student Google accounts under their campus.
 *
 * GET  — List enrolled students with their Google email address
 * POST — Enroll one or multiple students (Google email, unique username, display name)
 * DELETE — Revoke student enrollment
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, assertCampusScope } from "@/lib/rbac";
import { enrollmentDb } from "@/lib/enrollmentDb";
import { calculateAcademicYear } from "@stunet/types";
import { z } from "zod";

const EnrollStudentSchema = z.object({
  email: z.string().email().max(254),
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
  campusId: z.string().optional(),
});

const BulkEnrollSchema = z.object({
  students: z.array(EnrollStudentSchema).min(1).max(200),
  campusId: z.string().optional(),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const campusParam = searchParams.get("campus");

  const targetCampusId =
    session.role === "CAMPUS_MANAGER" ? session.managedCampusId : campusParam || undefined;

  if (session.role === "CAMPUS_MANAGER" && !targetCampusId) {
    return NextResponse.json({ error: "Campus manager has no assigned campus" }, { status: 400 });
  }

  try {
    // Fetch students for target campus
    const identities = await enrollmentDb.userIdentity.findMany({
      where: {
        ...(targetCampusId ? { campusId: targetCampusId } : {}),
        role: { in: ["STUDENT", "CLUB_MANAGER", "GUEST"] },
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
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch private details (email) for each student
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
      email: privMap.get(u.id) ?? null,
      isActive: u.isActive,
      isBanned: u.isBanned,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({ students });
  } catch (err) {
    console.error("GET /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to fetch enrolled students", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  try {
    const body = await req.json();

    // Check if bulk enrollment or single enrollment
    const isBulk = Array.isArray(body?.students);

    if (isBulk) {
      const parsed = BulkEnrollSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid student roster data", details: parsed.error.format() },
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

        // Check if email already enrolled
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

        // Check if username already exists
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

        // Create user identity
        const currentSessionStartYear =
          new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const studentJoiningYear = s.joiningYear ?? currentSessionStartYear;

        const newUser = await enrollmentDb.userIdentity.create({
          data: {
            displayName: s.displayName.trim(),
            username: normalizedUsername,
            role: "STUDENT",
            verificationStatus: "VERIFIED",
            campusId: targetCampusId,
            headline: s.headline?.trim() || null,
            joiningYear: studentJoiningYear,
            isActive: true,
            isBanned: false,
          },
        });

        // Create private details (email)
        await enrollmentDb.userPrivateDetails.create({
          data: {
            userId: newUser.id,
            email: normalizedEmail,
          },
        });

        results.push({ email: normalizedEmail, username: normalizedUsername, status: "success" });
      }

      const successCount = results.filter((r) => r.status === "success").length;
      return NextResponse.json({
        success: true,
        message: `Successfully enrolled ${successCount} student(s) under campus.`,
        results,
      });
    }

    // Single enrollment
    const parsed = EnrollStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid student data", details: parsed.error.format() },
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

    // Check unique email
    const existingEmail = await enrollmentDb.userPrivateDetails.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: `Google email "${normalizedEmail}" is already enrolled or registered in StuNet.` },
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
          error: `Username "@${normalizedUsername}" is already taken. Student usernames must be unique.`,
        },
        { status: 409 },
      );
    }

    // Create user identity
    const currentSessionStartYear =
      new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1;
    const studentJoiningYear = parsed.data.joiningYear ?? currentSessionStartYear;

    const student = await enrollmentDb.userIdentity.create({
      data: {
        displayName: parsed.data.displayName.trim(),
        username: normalizedUsername,
        role: "STUDENT",
        verificationStatus: "VERIFIED",
        campusId: targetCampusId,
        headline: parsed.data.headline?.trim() || null,
        joiningYear: studentJoiningYear,
        isActive: true,
        isBanned: false,
      },
    });

    // Create private details
    await enrollmentDb.userPrivateDetails.create({
      data: {
        userId: student.id,
        email: normalizedEmail,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully enrolled ${student.displayName} (@${student.username}) with Google authorization email ${normalizedEmail}.`,
        student: {
          ...student,
          email: normalizedEmail,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to enroll student", detail: String(err) },
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
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (session.role === "CAMPUS_MANAGER" && student.campusId !== session.managedCampusId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify students outside your campus." },
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
      message: `Revoked campus student privileges for @${student.username}. User converted to Guest.`,
    });
  } catch (err) {
    console.error("DELETE /api/directory/enroll error:", err);
    return NextResponse.json(
      { error: "Failed to revoke enrollment", detail: String(err) },
      { status: 500 },
    );
  }
}
