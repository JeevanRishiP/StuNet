/**
 * Admin Club Role Assignment API
 * PATCH  /api/clubs/[clubId]/members/[userId] — assign or revoke a club role
 *
 * Security:
 *   - SUPER_ADMIN or CAMPUS_MANAGER (scoped to their campus)
 *   - On revoke: sets revokedAt on ClubRoleAssignment + flags posts/comments orphaned
 *     (content is NOT deleted — orphaned content is reviewable, not erased)
 *   - Writes admin_audit_log entry
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

interface Params {
  params: { clubId: string; userId: string };
}

const RoleSchema = z.object({
  action: z.enum(["ASSIGN", "REVOKE"]),
  role: z.enum(["MEMBER", "MANAGER", "PRESIDENT"]),
  reason: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
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

  const parsed = RoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action, role, reason } = parsed.data;

  // Verify club exists and campus scope
  const club = await adminDb.club.findUnique({
    where: { id: params.clubId },
    select: { id: true, campusId: true, name: true },
  });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  if (session.role === "CAMPUS_MANAGER" && club.campusId !== session.managedCampusId) {
    return NextResponse.json({ error: "Forbidden — campus scope violation" }, { status: 403 });
  }

  if (action === "ASSIGN") {
    // Upsert membership + create role assignment record
    await adminDb.$transaction([
      adminDb.clubMember.upsert({
        where: { clubId_userId: { clubId: params.clubId, userId: params.userId } },
        create: { clubId: params.clubId, userId: params.userId, role },
        update: { role, isActive: true },
      }),
      adminDb.clubRoleAssignment.create({
        data: {
          clubId: params.clubId,
          userId: params.userId,
          role,
          assignedById: session.userId,
        },
      }),
      adminDb.adminAuditLog.create({
        data: {
          adminId: session.userId,
          action: "CLUB_ROLE_ASSIGN",
          targetType: "ClubMember",
          targetId: params.userId,
          metaJson: { clubId: params.clubId, role, reason },
        },
      }),
    ]);
  } else {
    // REVOKE — find the active assignment
    const activeAssignment = await adminDb.clubRoleAssignment.findFirst({
      where: {
        clubId: params.clubId,
        userId: params.userId,
        role,
        revokedAt: null,
      },
    });

    if (!activeAssignment) {
      return NextResponse.json(
        { error: "No active role assignment found to revoke" },
        { status: 404 },
      );
    }

    const now = new Date();

    // Flag the assignment revoked + flag posts/comments as orphaned (NOT deleted)
    await adminDb.$transaction([
      adminDb.clubRoleAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          revokedAt: now,
          revokedById: session.userId,
          contentOrphanedAt: now,
        },
      }),
      // Demote to MEMBER (don't remove from club — plan rule)
      adminDb.clubMember.update({
        where: { clubId_userId: { clubId: params.clubId, userId: params.userId } },
        data: { role: "MEMBER" },
      }),
      adminDb.adminAuditLog.create({
        data: {
          adminId: session.userId,
          action: "CLUB_ROLE_REVOKE",
          targetType: "ClubMember",
          targetId: params.userId,
          metaJson: { clubId: params.clubId, role, reason },
        },
      }),
    ]);
  }

  return NextResponse.json({ success: true, action, role });
}
