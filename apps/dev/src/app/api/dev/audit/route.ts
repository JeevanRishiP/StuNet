/**
 * GET  /api/dev/audit?adminId=&action=&page=1
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const adminId = searchParams.get("adminId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;

  const where = {
    ...(adminId ? { adminId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
  };

  const [logs, total] = await Promise.all([
    devDb.adminAuditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { displayName: true, username: true } } },
    }),
    devDb.adminAuditLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
