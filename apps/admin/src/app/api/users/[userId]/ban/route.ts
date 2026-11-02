/**
 * Admin User Ban API
 * POST /api/users/[userId]/ban — ban or unban a user
 *
 * PLAN RULE: Destructive action — requires typed confirmation.
 * Client must pass { confirm: "BAN <username>" } for ban, { confirm: "UNBAN <username>" } for unban.
 * Always writes admin_audit_log.
 * SUPER_ADMIN only — CAMPUS_MANAGER cannot ban users (escalation path).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

interface Params {
  params: { userId: string };
}

const BanSchema = z.object({
  action: z.enum(["BAN", "UNBAN"]),
  reason: z.string().min(10).max(500),
  confirm: z.string(), // must match "BAN <username>" or "UNBAN <username>"
});

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  let session;
  try {
    // SUPER_ADMIN only — CAMPUS_MANAGER cannot ban
    session = await requireAdmin(["SUPER_ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action, reason, confirm } = parsed.data;

  // Fetch target to validate confirmation string
  const target = await adminDb.userIdentity.findUnique({
    where: { id: params.userId },
    select: { id: true, username: true, isBanned: true, role: true },
  });

  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Typed confirmation check — plan Rule #3
  const expectedConfirm = `${action} ${target.username}`;
  if (confirm !== expectedConfirm) {
    return NextResponse.json(
      { error: `Confirmation mismatch. Type exactly: "${expectedConfirm}"` },
      { status: 422 },
    );
  }

  // Cannot ban another SUPER_ADMIN
  if (target.role === "SUPER_ADMIN" && action === "BAN") {
    return NextResponse.json({ error: "Cannot ban a SUPER_ADMIN" }, { status: 403 });
  }

  if (action === "BAN" && target.isBanned) {
    return NextResponse.json({ error: "User is already banned" }, { status: 409 });
  }
  if (action === "UNBAN" && !target.isBanned) {
    return NextResponse.json({ error: "User is not banned" }, { status: 409 });
  }

  const [updated] = await adminDb.$transaction([
    adminDb.userIdentity.update({
      where: { id: params.userId },
      data: {
        isBanned: action === "BAN",
        isActive: action !== "BAN",
        bannedAt: action === "BAN" ? new Date() : null,
        bannedReason: action === "BAN" ? reason : null,
      },
      select: { id: true, username: true, isBanned: true },
    }),
    adminDb.adminAuditLog.create({
      data: {
        adminId: session.userId,
        action: `USER_${action}`,
        targetType: "UserIdentity",
        targetId: params.userId,
        metaJson: { reason },
      },
    }),
  ]);

  return NextResponse.json(updated);
}
