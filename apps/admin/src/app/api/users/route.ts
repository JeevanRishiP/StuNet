import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let adminSession: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    adminSession = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const campusParam = searchParams.get("campusId") || searchParams.get("campus");
  const roleParam = searchParams.get("role");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200);

  const targetCampusId =
    adminSession.role === "CAMPUS_MANAGER"
      ? adminSession.managedCampusId || adminSession.campusId
      : campusParam || undefined;

  try {
    const rolesFilter: UserRole[] =
      roleParam && roleParam !== "ALL"
        ? roleParam === "STUDENT"
          ? [UserRole.STUDENT, UserRole.CLUB_MANAGER]
          : [roleParam as UserRole]
        : [UserRole.STUDENT, UserRole.CLUB_MANAGER];

    const users = await adminDb.userIdentity.findMany({
      where: {
        ...(targetCampusId ? { campusId: targetCampusId } : {}),
        role: { in: rolesFilter },
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" } },
                { username: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        section: true,
        joiningYear: true,
        campusId: true,
      },
      orderBy: [{ displayName: "asc" }, { username: "asc" }],
      take: limit,
    });

    return NextResponse.json({ users, items: users });
  } catch (error) {
    console.error("Failed to query users:", error);
    return NextResponse.json({ error: "Failed to query users from database" }, { status: 500 });
  }
}
