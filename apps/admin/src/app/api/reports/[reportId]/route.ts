/**
 * Admin Report Resolution API
 * PATCH /api/reports/[reportId] — resolve a report
 *
 * Actions:
 *   DISMISS           — no action, close the report
 *   RESOLVE_NO_ACTION — reviewed, no policy violation found
 *   RESOLVE_ACTION_TAKEN — action was taken (e.g. content removed, user banned)
 *
 * Always writes admin_audit_log.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import { z } from "zod";

interface Params {
  params: { reportId: string };
}

const ResolveSchema = z.object({
  action: z.enum(["DISMISS", "RESOLVE_NO_ACTION", "RESOLVE_ACTION_TAKEN"]),
  resolution: z.string().max(500).optional(),
});

// Map UI action → DB ReportStatus value
const ACTION_STATUS = {
  DISMISS: "DISMISSED",
  RESOLVE_NO_ACTION: "RESOLVED_NO_ACTION",
  RESOLVE_ACTION_TAKEN: "RESOLVED_ACTION_TAKEN",
} as const;

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await adminDb.report.findUnique({
    where: { id: params.reportId },
    select: { id: true, status: true },
  });

  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  if (report.status !== "OPEN" && report.status !== "UNDER_REVIEW") {
    return NextResponse.json({ error: "Report is already resolved" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ResolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { action, resolution } = parsed.data;
  const newStatus = ACTION_STATUS[action];

  const [updated] = await adminDb.$transaction([
    adminDb.report.update({
      where: { id: params.reportId },
      data: {
        status: newStatus,
        reviewedById: session.userId,
        reviewedAt: new Date(),
        resolution: resolution ?? null,
      },
      select: { id: true, status: true },
    }),
    adminDb.adminAuditLog.create({
      data: {
        adminId: session.userId,
        action: `REPORT_${action}`,
        targetType: "Report",
        targetId: params.reportId,
        metaJson: resolution ? { resolution } : undefined,
      },
    }),
  ]);

  return NextResponse.json(updated);
}
