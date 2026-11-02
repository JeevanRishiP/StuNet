import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

// PATCH /api/achievements/[achievementId] — verify or reject a submission
export async function PATCH(req: NextRequest, { params }: { params: { achievementId: string } }) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { achievementId } = params;

  const existing = await adminDb.achievement.findUnique({
    where: { id: achievementId },
    select: {
      id: true,
      verificationStatus: true,
      userId: true,
      user: { select: { campusId: true } },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Achievement not found" }, { status: 404 });
  }

  // Campus-scoped admins can only act on their campus users
  if (
    admin.role === "CAMPUS_MANAGER" &&
    admin.managedCampusId &&
    existing.user.campusId !== admin.managedCampusId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.verificationStatus !== "PENDING") {
    return NextResponse.json(
      { error: "Only PENDING achievements can be actioned" },
      { status: 409 },
    );
  }

  let body: { action?: unknown; rejectionReason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "VERIFY" ? "VERIFY" : body.action === "REJECT" ? "REJECT" : null;
  if (!action) {
    return NextResponse.json({ error: "action must be VERIFY or REJECT" }, { status: 400 });
  }

  const rejectionReason =
    action === "REJECT" && typeof body.rejectionReason === "string"
      ? body.rejectionReason.trim() || null
      : null;

  if (action === "REJECT" && !rejectionReason) {
    return NextResponse.json(
      { error: "rejectionReason is required when rejecting" },
      { status: 400 },
    );
  }

  const now = new Date();

  const updated = await adminDb.$transaction(async (tx) => {
    const achievement = await tx.achievement.update({
      where: { id: achievementId },
      data: {
        verificationStatus: action === "VERIFY" ? "VERIFIED" : "REJECTED",
        verifiedById: admin.userId,
        verifiedAt: now,
        rejectionReason: action === "REJECT" ? rejectionReason : null,
      },
      select: {
        id: true,
        title: true,
        verificationStatus: true,
        verifiedAt: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: action === "VERIFY" ? "ACHIEVEMENT_VERIFIED" : "ACHIEVEMENT_REJECTED",
        targetType: "achievement",
        targetId: achievementId,
        metaJson: {
          userId: existing.userId,
          action,
          ...(rejectionReason ? { rejectionReason } : {}),
        },
      },
    });

    return achievement;
  });

  return NextResponse.json({ achievement: updated });
}
