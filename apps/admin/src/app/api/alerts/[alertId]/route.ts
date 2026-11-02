import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

// PATCH /api/alerts/[alertId] — deactivate or update an alert
export async function PATCH(req: NextRequest, { params }: { params: { alertId: string } }) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["CAMPUS_MANAGER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(admin.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { alertId } = params;

  const existing = await adminDb.campusLiveAlert.findUnique({
    where: { id: alertId },
    select: { id: true, campusId: true, isActive: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  // Campus-scoped admins can only touch their campus
  if (
    admin.role === "CAMPUS_MANAGER" &&
    admin.managedCampusId &&
    existing.campusId !== admin.managedCampusId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { isActive?: unknown; expiresAt?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body — default to deactivate
  }

  const isActive = typeof body.isActive === "boolean" ? body.isActive : false;
  const expiresAt = typeof body.expiresAt === "string" ? new Date(body.expiresAt) : undefined;

  const updated = await adminDb.$transaction(async (tx) => {
    const alert = await tx.campusLiveAlert.update({
      where: { id: alertId },
      data: {
        isActive,
        ...(expiresAt !== undefined ? { expiresAt } : {}),
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        severity: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: isActive ? "ALERT_REACTIVATED" : "ALERT_DEACTIVATED",
        targetType: "campus_live_alert",
        targetId: alertId,
        metaJson: { isActive },
      },
    });

    return alert;
  });

  return NextResponse.json({ alert: updated });
}

// DELETE /api/alerts/[alertId] — hard deactivate (sets isActive false)
export async function DELETE(_req: NextRequest, { params }: { params: { alertId: string } }) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["CAMPUS_MANAGER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(admin.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { alertId } = params;

  const existing = await adminDb.campusLiveAlert.findUnique({
    where: { id: alertId },
    select: { id: true, campusId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  if (
    admin.role === "CAMPUS_MANAGER" &&
    admin.managedCampusId &&
    existing.campusId !== admin.managedCampusId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await adminDb.$transaction([
    adminDb.campusLiveAlert.update({
      where: { id: alertId },
      data: { isActive: false },
    }),
    adminDb.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: "ALERT_DEACTIVATED",
        targetType: "campus_live_alert",
        targetId: alertId,
        metaJson: { method: "DELETE" },
      },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}
