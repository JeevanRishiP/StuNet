/**
 * apps/admin/src/app/api/engagement-anomalies/route.ts
 *
 * Admin API for Engagement Manipulation Anomaly Flags.
 * GET   — List engagement anomaly flags (filterable by status)
 * PATCH — Update status (REVIEWED / DISMISSED) for human moderation review
 *
 * Security:
 * - Restricted to SUPER_ADMIN and CAMPUS_MANAGER
 * - Writes resolution actions to admin_audit_logs
 * - NEVER takes automated action against accounts or content
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import type { AnomalyStatus } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusParam = (url.searchParams.get("status") as AnomalyStatus) ?? "FLAGGED";
  const campusFilter = session.role === "CAMPUS_MANAGER" ? session.managedCampusId : undefined;

  try {
    const flags = await adminDb.engagementAnomalyFlag.findMany({
      where: {
        status: statusParam,
        ...(campusFilter ? { user: { campusId: campusFilter } } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            studentEmail: true,
            role: true,
            campus: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        flaggedAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({ flags });
  } catch (err) {
    console.error("[EngagementAnomalies] Query failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch engagement anomaly flags" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: AnomalyStatus };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id, status } = body;
  if (!id || !status || !["REVIEWED", "DISMISSED"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status update. Allowed statuses: REVIEWED, DISMISSED" },
      { status: 400 },
    );
  }

  try {
    const existing = await adminDb.engagementAnomalyFlag.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Engagement anomaly flag not found" }, { status: 404 });
    }

    const updated = await adminDb.engagementAnomalyFlag.update({
      where: { id },
      data: { status },
    });

    // Write human audit trail log
    await adminDb.adminAuditLog.create({
      data: {
        adminId: session.userId,
        action: "UPDATE_ENGAGEMENT_ANOMALY_STATUS",
        targetType: "engagement_anomaly_flags",
        targetId: id,
        metaJson: {
          previousStatus: existing.status,
          newStatus: status,
          userId: existing.userId,
          concentrationRatio: existing.concentrationRatio,
        },
      },
    });

    return NextResponse.json({ flag: updated });
  } catch (err) {
    console.error("[EngagementAnomalies] Update failed:", err);
    return NextResponse.json(
      { error: "Failed to update engagement anomaly status" },
      { status: 500 },
    );
  }
}
