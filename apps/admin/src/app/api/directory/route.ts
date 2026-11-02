/**
 * Admin Directory API
 * GET /api/directory — search/list users (admin-safe fields only)
 *
 * Query params:
 *   name   — filter by displayName / username (icontains)
 *   campus — filter by campusId
 *   role   — filter by UserRole enum value
 *   status — filter by VerificationStatus enum value
 *   cursor — cursor-based pagination
 *   limit  — default 25, max 100
 *
 * Security:
 *   - SUPER_ADMIN / CAMPUS_MANAGER only (via requireAdmin)
 *   - CAMPUS_MANAGER automatically scoped to their campus
 *   - Uses adminDb — NEVER returns user_private_details fields
 *   - All results serialized through serializeAdminUser (the one definition)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { serializeAdminUser } from "@/lib/serializers";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    // requireAdmin calls redirect() — this catch handles non-redirect errors
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? undefined;
  const campus = url.searchParams.get("campus") ?? undefined;
  const role = url.searchParams.get("role") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);

  // CAMPUS_MANAGER: scope to their campus — they cannot query outside it
  const effectiveCampusId =
    session.role === "CAMPUS_MANAGER"
      ? session.managedCampusId // always their campus
      : campus; // SUPER_ADMIN can filter by any campus (or none)

  // Build where clause — all parameterized through Prisma (no raw SQL interpolation)
  const where: Prisma.UserIdentityWhereInput = {
    ...(effectiveCampusId ? { campusId: effectiveCampusId } : {}),
    ...(role ? { role: role as Prisma.EnumUserRoleFilter } : {}),
    ...(status ? { verificationStatus: status as Prisma.EnumVerificationStatusFilter } : {}),
    ...(name
      ? {
          OR: [
            { displayName: { contains: name, mode: "insensitive" } },
            { username: { contains: name, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await adminDb.userIdentity.findMany({
    where,
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      headline: true,
      role: true,
      verificationStatus: true,
      campusId: true,
      isActive: true,
      isBanned: true,
      createdAt: true,
      campus: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = users.length > limit;
  const page = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return NextResponse.json({
    users: page.map(serializeAdminUser),
    nextCursor,
  });
}
