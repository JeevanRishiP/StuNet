/**
 * GET  /api/dev/users?page=1&limit=20&role=&status=&q=
 * POST /api/dev/users — create user
 * PATCH /api/dev/users — update user by id in body
 * DELETE /api/dev/users?id= — delete user
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";
import { calculateAcademicYear } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
  const role = searchParams.get("role") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const where = {
    ...(role
      ? { role: role as "GUEST" | "STUDENT" | "CLUB_MANAGER" | "CAMPUS_MANAGER" | "SUPER_ADMIN" }
      : {}),
    ...(status ? { verificationStatus: status as "PENDING" | "VERIFIED" | "REJECTED" } : {}),
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
        campus: { select: { name: true, slug: true } },
        managedCampus: { select: { id: true, name: true, slug: true } },
        _count: { select: { posts: true, sentConnections: true, achievements: true } },
      },
    }),
    devDb.userIdentity.count({ where }),
  ]);

  const mapped = users.map((u) => ({
    ...u,
    academicYear: calculateAcademicYear(u.joiningYear),
    _count: {
      posts: u._count.posts,
      connections: u._count.sentConnections,
      achievements: u._count.achievements,
    },
  }));

  return NextResponse.json({ users: mapped, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const joiningYear = body.joiningYear ? Number(body.joiningYear) : null;
    const user = await devDb.userIdentity.create({
      data: {
        displayName: body.displayName as string,
        username: body.username as string,
        role:
          (body.role as "GUEST" | "STUDENT" | "CLUB_MANAGER" | "CAMPUS_MANAGER" | "SUPER_ADMIN") ??
          "STUDENT",
        verificationStatus:
          (body.verificationStatus as "PENDING" | "VERIFIED" | "REJECTED") ?? "PENDING",
        campusId: (body.campusId as string | null) ?? null,
        managedCampusId: (body.managedCampusId as string | null) ?? null,
        headline: (body.headline as string | null) ?? null,
        bio: (body.bio as string | null) ?? null,
        avatarUrl: (body.avatarUrl as string | null) ?? null,
        joiningYear,
      },
    });
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
