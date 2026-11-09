import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const campusId = req.nextUrl.searchParams.get("campusId");

  try {
    const batches = await devDb.campusBatch.findMany({
      where: campusId ? { campusId } : {},
      include: {
        campus: {
          select: { id: true, name: true, city: true, slug: true },
        },
      },
      orderBy: [{ campusId: "asc" }, { year: "desc" }],
    });

    return NextResponse.json({ batches });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch batches", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const body = (await req.json()) as {
      campusId: string;
      year: number | string;
      numberOfStudents?: number | string | null;
      numberOfSections?: number | string | null;
      degree?: string | null;
      successCoachEmployeeId?: string | null;
      successCoachName?: string | null;
    };

    if (!body.campusId) {
      return NextResponse.json({ error: "campusId is required" }, { status: 400 });
    }

    const year = Number(body.year);
    if (!year || isNaN(year)) {
      return NextResponse.json({ error: "A valid batch year is required" }, { status: 400 });
    }

    // Check if batch already exists for this campus and year
    const existing = await devDb.campusBatch.findUnique({
      where: {
        campusId_year: {
          campusId: body.campusId,
          year,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Batch ${year} already exists for this campus.` },
        { status: 409 },
      );
    }

    // If a success coach employee id was given, resolve/validate coach name
    let resolvedCoachName = body.successCoachName?.trim() || null;
    const coachEmpId = body.successCoachEmployeeId?.trim() || null;

    if (coachEmpId && !resolvedCoachName) {
      const match = await devDb.campusFaculty.findFirst({
        where: { employeeId: { equals: coachEmpId, mode: "insensitive" } },
      });
      if (match) {
        resolvedCoachName = match.name;
      }
    }

    const batch = await devDb.campusBatch.create({
      data: {
        campusId: body.campusId,
        year,
        numberOfStudents: body.numberOfStudents ? Number(body.numberOfStudents) : null,
        numberOfSections: body.numberOfSections ? Number(body.numberOfSections) : null,
        degree: body.degree?.trim() || null,
        successCoachEmployeeId: coachEmpId,
        successCoachName: resolvedCoachName,
      },
      include: {
        campus: { select: { id: true, name: true, city: true } },
      },
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create batch", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Batch id is required" }, { status: 400 });
  }

  try {
    await devDb.campusBatch.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete batch", detail: String(err) },
      { status: 500 },
    );
  }
}
