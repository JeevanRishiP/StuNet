import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

// GET /api/alerts — list active alerts for admin's campus
export async function GET() {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const alerts = await adminDb.campusLiveAlert.findMany({
    where: {
      ...(admin.managedCampusId ? { campusId: admin.managedCampusId } : {}),
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      campusId: true,
      campus: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ alerts });
}

// POST /api/alerts — create a new campus alert
export async function POST(req: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only CAMPUS_MANAGER (scoped) or SUPER_ADMIN can create alerts
  const allowedRoles = ["CAMPUS_MANAGER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(admin.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campusId = admin.managedCampusId;
  if (!campusId && admin.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No campus scope — cannot create alert" }, { status: 400 });
  }

  let body: {
    title?: unknown;
    body?: unknown;
    severity?: unknown;
    expiresAt?: unknown;
    campusId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : null;
  const alertBody = typeof body.body === "string" ? body.body.trim() : null;
  const severity = ["INFO", "WARNING", "CRITICAL"].includes(body.severity as string)
    ? (body.severity as "INFO" | "WARNING" | "CRITICAL")
    : "INFO";
  const expiresAt = typeof body.expiresAt === "string" ? new Date(body.expiresAt) : null;

  // SUPER_ADMIN may specify a campusId; others are scoped
  const targetCampusId =
    admin.role === "SUPER_ADMIN" && typeof body.campusId === "string"
      ? body.campusId
      : (campusId ?? null);

  if (!title || !alertBody || !targetCampusId) {
    return NextResponse.json({ error: "title, body, and campusId are required" }, { status: 400 });
  }

  if (title.length > 200 || alertBody.length > 1000) {
    return NextResponse.json(
      { error: "title max 200 chars, body max 1000 chars" },
      { status: 422 },
    );
  }

  const alert = await adminDb.$transaction(async (tx) => {
    const created = await tx.campusLiveAlert.create({
      data: {
        campusId: targetCampusId,
        createdById: admin.userId,
        title,
        body: alertBody,
        severity,
        expiresAt,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        body: true,
        severity: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: admin.userId,
        action: "ALERT_CREATED",
        targetType: "campus_live_alert",
        targetId: created.id,
        metaJson: { campusId: targetCampusId, title, severity },
      },
    });

    return created;
  });

  return NextResponse.json({ alert }, { status: 201 });
}
