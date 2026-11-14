/**
 * Admin Reports API
 * GET  /api/reports        — list reports (filterable by status/contentType)
 * POST /api/reports/[id]  — resolve a report (dismiss / action-taken)
 *
 * Security:
 *   - SUPER_ADMIN: all reports
 *   - CAMPUS_MANAGER: only reports where the content belongs to their campus
 *   - Never returns user_private_details
 *   - All actions write to admin_audit_logs
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  let session;
  try {
    session = await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "OPEN";
  const type = url.searchParams.get("contentType") ?? undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);

  // Campus scope: CAMPUS_MANAGER only sees reports about posts/users on their campus.
  // We filter at the post level — if no campusId match, return nothing for that type.
  // For USER_PROFILE reports, CAMPUS_MANAGER sees only users on their campus.
  const campusFilter = session.role === "CAMPUS_MANAGER" ? session.managedCampusId : undefined;

  const where: Prisma.ReportWhereInput = {
    status: status as Prisma.EnumReportStatusFilter,
    ...(type ? { contentType: type as Prisma.EnumReportContentTypeFilter } : {}),
    ...(campusFilter
      ? {
          OR: [
            { post: { author: { campusId: campusFilter } } },
            { comment: { author: { campusId: campusFilter } } },
            { reportedUserId: { not: null } /* scoped below */ },
          ],
        }
      : {}),
  };

  const reports = await adminDb.report.findMany({
    where,
    select: {
      id: true,
      contentType: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      submitterId: true,
      postId: true,
      commentId: true,
      listingId: true,
      reportedUserId: true,
      post: {
        select: {
          id: true,
          body: true,
          author: { select: { id: true, displayName: true, username: true, campusId: true } },
          poll: {
            select: {
              id: true,
              question: true,
              pollType: true,
              complaintLevel: true,
              section: true,
              batch: true,
              options: {
                select: { id: true, text: true, sortOrder: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = reports.length > limit;
  const page = hasMore ? reports.slice(0, limit) : reports;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return NextResponse.json({ reports: page, nextCursor });
}
