/**
 * GET  /api/dev/clubs?q=&campusId=&page=1
 * POST /api/dev/clubs
 * PATCH /api/dev/clubs
 * DELETE /api/dev/clubs?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;
  const campusId = searchParams.get("campusId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where = {
    ...(campusId ? { campusId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [clubs, total] = await Promise.all([
    devDb.club.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: "asc" },
      include: {
        campus: { select: { name: true, slug: true } },
        _count: { select: { members: { where: { isActive: true } } } },
      },
    }),
    devDb.club.count({ where }),
  ]);

  return NextResponse.json({ clubs, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const club = await devDb.club.create({
      data: {
        name: body.name as string,
        slug: body.slug as string,
        description: (body.description as string) || "",
        category: (body.category as string) || "General",
        campusId: body.campusId as string,
        logoUrl: (body.logoUrl as string | null) ?? null,
        bannerUrl: (body.bannerUrl as string | null) ?? null,
        institutionalEmail: (body.institutionalEmail as string | null) ?? null,
        isActive: (body.isActive as boolean) ?? true,
      },
    });
    return NextResponse.json({ club }, { status: 201 });
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
  if (body.name !== undefined) data.name = body.name;
  if (body.slug !== undefined) data.slug = body.slug;
  if (body.description !== undefined) data.description = body.description;
  if (body.category !== undefined) data.category = body.category;
  if (body.campusId !== undefined) data.campusId = body.campusId;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
  if (body.bannerUrl !== undefined) data.bannerUrl = body.bannerUrl || null;
  if (body.institutionalEmail !== undefined)
    data.institutionalEmail = body.institutionalEmail || null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  try {
    const club = await devDb.club.update({
      where: { id },
      data,
    });
    return NextResponse.json({ club });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.club.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
