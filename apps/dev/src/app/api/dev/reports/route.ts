/**
 * GET  /api/dev/reports?page=1&status=&contentType=
 * PATCH /api/dev/reports — update status/resolution
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const status = searchParams.get("status") ?? undefined;
  const contentType = searchParams.get("contentType") ?? undefined;

  const where = {
    ...(status
      ? {
          status: status as
            "OPEN" | "UNDER_REVIEW" | "RESOLVED_ACTION_TAKEN" | "RESOLVED_NO_ACTION" | "DISMISSED",
        }
      : {}),
    ...(contentType
      ? {
          contentType: contentType as
            | "POST"
            | "COMMENT"
            | "USER_PROFILE"
            | "CLUB"
            | "GROUP"
            | "MARKET_LISTING"
            | "POLL_ENTRY",
        }
      : {}),
  };

  const [reports, total] = await Promise.all([
    devDb.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        submitter: { select: { displayName: true, username: true } },
      },
    }),
    devDb.report.count({ where }),
  ]);

  return NextResponse.json({ reports, total, page, limit });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (
      ["RESOLVED_ACTION_TAKEN", "RESOLVED_NO_ACTION", "DISMISSED"].includes(body.status as string)
    ) {
      data.reviewedAt = new Date();
      data.reviewedById = "dev-console";
    }
  }
  if (body.resolution !== undefined || body.resolutionNotes !== undefined) {
    data.resolution = (body.resolution as string) || (body.resolutionNotes as string) || null;
  }

  try {
    const report = await devDb.report.update({
      where: { id },
      data,
    });
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}
