/**
 * GET  /api/dev/alerts?campusId=&severity=
 * POST /api/dev/alerts
 * PATCH /api/dev/alerts
 * DELETE /api/dev/alerts?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const campusId = searchParams.get("campusId") ?? undefined;
  const severity = searchParams.get("severity") ?? undefined;
  const active = searchParams.get("active");

  const where = {
    ...(campusId ? { campusId } : {}),
    ...(severity ? { severity: severity as "INFO" | "WARNING" | "CRITICAL" } : {}),
    ...(active !== null && active !== "" ? { isActive: active === "true" } : {}),
  };

  const alerts = await devDb.campusLiveAlert.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { campus: { select: { name: true } } },
  });

  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const alert = await devDb.campusLiveAlert.create({
      data: {
        campusId: body.campusId as string,
        createdById: (body.createdById as string) || "dev-console",
        severity: (body.severity as "INFO" | "WARNING" | "CRITICAL") ?? "INFO",
        title: body.title as string,
        body: ((body.body as string) || (body.message as string)) ?? "",
        expiresAt: body.expiresAt ? new Date(body.expiresAt as string) : null,
        isActive: true,
      },
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.body !== undefined || body.message !== undefined) {
    data.body = ((body.body as string) || (body.message as string)) ?? "";
  }
  if (body.severity !== undefined) data.severity = body.severity;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.expiresAt !== undefined)
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt as string) : null;

  try {
    const alert = await devDb.campusLiveAlert.update({
      where: { id },
      data,
    });
    return NextResponse.json({ alert });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.campusLiveAlert.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
