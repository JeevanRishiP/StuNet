/**
 * GET    /api/dev/campus-admins — List all campuses with assigned campus managers, student counts, and club counts
 * POST   /api/dev/campus-admins — Appoint / create a campus manager for a campus
 * DELETE /api/dev/campus-admins?userId=... — Revoke campus manager privileges
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";
import * as argon2 from "argon2";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const { searchParams } = req.nextUrl;
    const search = searchParams.get("search")?.toLowerCase().trim();
    const state = searchParams.get("state");
    const status = searchParams.get("status"); // "assigned" | "unassigned" | "all"

    // Fetch all campuses
    const campuses = await devDb.campus.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { universityName: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { state: { contains: search, mode: "insensitive" } },
                { slug: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(state ? { state: { equals: state, mode: "insensitive" } } : {}),
      },
      include: {
        campusManagers: {
          select: {
            id: true,
            displayName: true,
            username: true,
            role: true,
            verificationStatus: true,
            isBanned: true,
            avatarUrl: true,
            createdAt: true,
            authCredential: {
              select: { id: true },
            },
          },
        },
        _count: {
          select: {
            userIdentities: true,
            clubs: true,
            faculties: true,
            liveAlerts: true,
          },
        },
      },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    // Fetch private details (email) for all assigned admins
    const allAdminIds = campuses.flatMap((c) => c.campusManagers.map((m) => m.id));
    const privateDetails =
      allAdminIds.length > 0
        ? await devDb.userPrivateDetails.findMany({
            where: { userId: { in: allAdminIds } },
            select: { userId: true, email: true, totpSecret: true },
          })
        : [];
    const privMap = new Map(privateDetails.map((p) => [p.userId, p]));

    // Format campus list
    const formatted = campuses.map((c) => {
      const admins = c.campusManagers.map((m) => {
        const priv = privMap.get(m.id);
        return {
          id: m.id,
          displayName: m.displayName,
          username: m.username,
          role: m.role,
          verificationStatus: m.verificationStatus,
          isBanned: m.isBanned,
          avatarUrl: m.avatarUrl,
          createdAt: m.createdAt,
          hasPassword: Boolean(m.authCredential),
          email: priv?.email ?? null,
          hasTotp: Boolean(priv?.totpSecret),
        };
      });

      return {
        id: c.id,
        name: c.name,
        universityName: c.universityName,
        slug: c.slug,
        city: c.city,
        state: c.state,
        emailDomain: c.emailDomain,
        isActive: c.isActive,
        studentCount: c._count.userIdentities,
        clubCount: c._count.clubs,
        facultyCount: c._count.faculties,
        alertCount: c._count.liveAlerts,
        admins,
        hasAdmin: admins.length > 0,
      };
    });

    // Apply status filter if requested
    const filtered =
      status === "assigned"
        ? formatted.filter((c) => c.hasAdmin)
        : status === "unassigned"
          ? formatted.filter((c) => !c.hasAdmin)
          : formatted;

    const totalCampuses = campuses.length;
    const assignedCount = formatted.filter((c) => c.hasAdmin).length;
    const unassignedCount = totalCampuses - assignedCount;
    const totalAdmins = allAdminIds.length;

    return NextResponse.json({
      campuses: filtered,
      stats: {
        totalCampuses,
        assignedCount,
        unassignedCount,
        totalAdmins,
        coveragePercent: totalCampuses > 0 ? Math.round((assignedCount / totalCampuses) * 100) : 0,
      },
    });
  } catch (err) {
    console.error("GET /api/dev/campus-admins error:", err);
    return NextResponse.json(
      { error: "Failed to list campus admins", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const body = (await req.json()) as {
      mode: "assign_existing" | "create_new";
      campusId: string;
      userId?: string;
      displayName?: string;
      username?: string;
      email?: string;
      password?: string;
    };

    if (!body.campusId) {
      return NextResponse.json({ error: "campusId is required" }, { status: 400 });
    }

    const campus = await devDb.campus.findUnique({ where: { id: body.campusId } });
    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    // Default password if not provided
    const rawPassword = body.password?.trim() || "AdminPass123!";
    const passwordHash = await argon2.hash(rawPassword, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });

    if (body.mode === "assign_existing") {
      if (!body.userId) {
        return NextResponse.json(
          { error: "userId is required for assign_existing mode" },
          { status: 400 },
        );
      }

      // Update user identity to CAMPUS_MANAGER and set managedCampusId
      const updatedUser = await devDb.userIdentity.update({
        where: { id: body.userId },
        data: {
          role: "CAMPUS_MANAGER",
          managedCampusId: body.campusId,
          campusId: body.campusId,
          verificationStatus: "VERIFIED",
          isActive: true,
          isBanned: false,
        },
      });

      // Ensure auth credentials exist
      await devDb.authCredential.upsert({
        where: { userId: body.userId },
        update: body.password ? { passwordHash } : {},
        create: {
          userId: body.userId,
          passwordHash,
        },
      });

      // Ensure private details have a default TOTP secret for dev bypass
      const priv = await devDb.userPrivateDetails.findUnique({ where: { userId: body.userId } });
      if (priv && !priv.totpSecret) {
        await devDb.userPrivateDetails.update({
          where: { userId: body.userId },
          data: { totpSecret: "JBSWY3DPEHPK3PXP", totpEnabledAt: new Date() },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully appointed ${updatedUser.displayName} as Campus Admin for ${campus.name}`,
        user: updatedUser,
      });
    } else {
      // mode === "create_new"
      const displayName = body.displayName?.trim();
      const username = body.username?.trim().toLowerCase();
      const email = body.email?.trim().toLowerCase();

      if (!displayName || !username || !email) {
        return NextResponse.json(
          { error: "displayName, username, and email are required to create a new admin" },
          { status: 400 },
        );
      }

      // Check unique username
      const existingUser = await devDb.userIdentity.findUnique({ where: { username } });
      if (existingUser) {
        return NextResponse.json(
          { error: `Username @${username} is already taken.` },
          { status: 400 },
        );
      }

      // Check unique email
      const existingEmail = await devDb.userPrivateDetails.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json(
          { error: `Email ${email} is already registered.` },
          { status: 400 },
        );
      }

      // Create user identity
      const newUser = await devDb.userIdentity.create({
        data: {
          displayName,
          username,
          role: "CAMPUS_MANAGER",
          managedCampusId: body.campusId,
          campusId: body.campusId,
          verificationStatus: "VERIFIED",
          isActive: true,
          isBanned: false,
        },
      });

      // Create private details
      await devDb.userPrivateDetails.create({
        data: {
          userId: newUser.id,
          email,
          totpSecret: "JBSWY3DPEHPK3PXP",
          totpEnabledAt: new Date(),
        },
      });

      // Create auth credentials
      await devDb.authCredential.create({
        data: {
          userId: newUser.id,
          passwordHash,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: `Created new Campus Admin @${username} for ${campus.name}`,
          user: newUser,
          credentials: {
            email,
            password: rawPassword,
            totpBypass: "123456",
          },
        },
        { status: 201 },
      );
    }
  } catch (err) {
    console.error("POST /api/dev/campus-admins error:", err);
    return NextResponse.json(
      { error: "Failed to appoint campus admin", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await devDb.userIdentity.findUnique({
      where: { id: userId },
      include: { managedCampus: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Revert role to STUDENT and clear managedCampusId
    await devDb.userIdentity.update({
      where: { id: userId },
      data: {
        role: "STUDENT",
        managedCampusId: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Revoked Campus Admin privileges for ${user.displayName}. Reverted to STUDENT.`,
    });
  } catch (err) {
    console.error("DELETE /api/dev/campus-admins error:", err);
    return NextResponse.json(
      { error: "Failed to revoke campus admin", detail: String(err) },
      { status: 500 },
    );
  }
}
