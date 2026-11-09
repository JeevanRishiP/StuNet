/**
 * GET  /api/dev/campuses
 * POST /api/dev/campuses
 * PATCH /api/dev/campuses
 * DELETE /api/dev/campuses?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? undefined;

  const campuses = await devDb.campus.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { name: "asc" },
    include: {
      _count: { select: { userIdentities: true, clubs: true } },
    },
  });

  const mapped = campuses.map((c) => ({
    ...c,
    _count: { users: c._count.userIdentities, clubs: c._count.clubs },
  }));

  return NextResponse.json({ campuses: mapped });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const facilities = Array.isArray(body.facilities)
      ? (body.facilities as string[])
      : typeof body.facilities === "string"
        ? (body.facilities as string)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    const campus = await devDb.campus.create({
      data: {
        name: body.name as string,
        slug:
          (body.slug as string) || (body.name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        universityName: (body.universityName as string | null) ?? null,
        emailDomain: (body.emailDomain as string | null) ?? null,
        city: body.city as string,
        state: body.state as string,
        country: (body.country as string) ?? "India",
        address: (body.address as string | null) ?? null,
        facilities,
        websiteUrl: (body.websiteUrl as string | null) ?? null,
        logoUrl: (body.logoUrl as string | null) ?? null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });
    return NextResponse.json({ campus }, { status: 201 });
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
  if (body.universityName !== undefined) data.universityName = body.universityName || null;
  if (body.emailDomain !== undefined) data.emailDomain = body.emailDomain || null;
  if (body.city !== undefined) data.city = body.city;
  if (body.state !== undefined) data.state = body.state;
  if (body.country !== undefined) data.country = body.country;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.websiteUrl !== undefined) data.websiteUrl = body.websiteUrl || null;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.facilities !== undefined) {
    data.facilities = Array.isArray(body.facilities)
      ? (body.facilities as string[])
      : typeof body.facilities === "string"
        ? (body.facilities as string)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
  }

  try {
    const campus = await devDb.campus.update({
      where: { id },
      data,
    });
    return NextResponse.json({ campus });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.campus.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
