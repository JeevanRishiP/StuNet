/**
 * Admin Onboarding API
 * GET  /api/onboarding — list pending verification requests
 * POST /api/onboarding — approve or reject a user's verification
 *
 * Security:
 *   - SUPER_ADMIN or CAMPUS_MANAGER only
 *   - CAMPUS_MANAGER automatically scoped to their campus
 *   - Bulk/destructive action (status change) writes to admin_audit_logs
 *   - Uses adminDb — never reads user_private_details
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { serializeAdminUser } from "@/lib/serializers";
import { z } from "zod";

const ApproveSchema = z.object({
  userId: z.string().cuid(),
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().max(500).optional(),
});

export async function GET(_req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const effectiveCampusId = session.role === "CAMPUS_MANAGER" ? session.managedCampusId : undefined;

  const pending = await adminDb.userIdentity.findMany({
    where: {
      verificationStatus: "PENDING",
      ...(effectiveCampusId ? { campusId: effectiveCampusId } : {}),
    },
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
    orderBy: { createdAt: "asc" }, // oldest first
    take: 100,
  });

  return NextResponse.json({ pending: pending.map(serializeAdminUser) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { userId, action, reason } = parsed.data;

  // Fetch the user to verify campus scope
  const target = await adminDb.userIdentity.findUnique({
    where: { id: userId },
    select: { id: true, campusId: true, verificationStatus: true },
  });

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // CAMPUS_MANAGER scope check
  if (session.role === "CAMPUS_MANAGER" && target.campusId !== session.managedCampusId) {
    return NextResponse.json({ error: "Forbidden — campus scope violation" }, { status: 403 });
  }

  if (target.verificationStatus !== "PENDING") {
    return NextResponse.json(
      { error: `User is not pending verification (current: ${target.verificationStatus})` },
      { status: 409 },
    );
  }

  const newStatus = action === "APPROVE" ? "VERIFIED" : "REJECTED";

  // Apply the status change + write audit log in a single transaction
  const [updated] = await adminDb.$transaction([
    adminDb.userIdentity.update({
      where: { id: userId },
      data: { verificationStatus: newStatus },
      select: { id: true, displayName: true, verificationStatus: true },
    }),
    adminDb.adminAuditLog.create({
      data: {
        adminId: session.userId,
        action: `ONBOARDING_${action}`,
        targetType: "UserIdentity",
        targetId: userId,
        metaJson: reason ? { reason } : undefined,
      },
    }),
  ]);

  return NextResponse.json({
    id: updated.id,
    displayName: updated.displayName,
    verificationStatus: updated.verificationStatus,
  });
}
