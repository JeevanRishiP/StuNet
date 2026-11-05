/**
 * GET  /api/dev/marketplace?page=1&status=
 * POST /api/dev/marketplace
 * PATCH /api/dev/marketplace
 * DELETE /api/dev/marketplace?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const status = searchParams.get("status") ?? undefined;

  const where = status ? { status: status as "ACTIVE" | "SOLD" | "FLAGGED" | "REMOVED" } : {};

  const [listings, total] = await Promise.all([
    devDb.campusMarketListing.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        seller: { select: { displayName: true, username: true } },
        images: { take: 1 },
      },
    }),
    devDb.campusMarketListing.count({ where }),
  ]);

  return NextResponse.json({ listings, total, page, limit });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "SOLD") data.soldAt = new Date();
  }
  if (body.condition !== undefined) data.condition = body.condition;
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description;
  if (body.priceInr !== undefined) data.priceInr = body.priceInr;
  if (body.flagReason !== undefined) data.flagReason = body.flagReason || null;

  try {
    const listing = await devDb.campusMarketListing.update({
      where: { id },
      data,
    });
    return NextResponse.json({ listing });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.campusMarketListing.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
