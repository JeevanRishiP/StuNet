import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

// GET /api/achievements — list PENDING achievements for admin review
export async function GET() {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const achievements = await adminDb.achievement.findMany({
    where: { verificationStatus: "PENDING" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      scope: true,
      platform: true,
      proofUrl: true,
      proofDocumentUrl: true,
      achievedAt: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          displayName: true,
          username: true,
          campusId: true,
          campus: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  // Campus-scoped admins see only their campus submissions
  const filtered =
    admin.role === "CAMPUS_MANAGER" && admin.managedCampusId
      ? achievements.filter((a) => a.user.campusId === admin.managedCampusId)
      : achievements;

  return NextResponse.json({ achievements: filtered });
}
