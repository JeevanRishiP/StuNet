import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const campusId = req.nextUrl.searchParams.get("campusId");
  const batchYear = req.nextUrl.searchParams.get("batchYear");
  const semester = req.nextUrl.searchParams.get("semester");

  try {
    const subjects = await devDb.semesterSubject.findMany({
      where: {
        ...(campusId ? { campusId } : {}),
        ...(batchYear ? { batchYear: Number(batchYear) } : {}),
        ...(semester ? { semester: Number(semester) } : {}),
      },
      include: {
        campus: {
          select: { id: true, name: true, city: true, slug: true },
        },
      },
      orderBy: [
        { campusId: "asc" },
        { batchYear: "desc" },
        { semester: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ subjects });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch subjects", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  try {
    const body = (await req.json()) as {
      campusId: string;
      batchYear: number | string;
      semester: number | string;
      subjects: Array<{
        name: string;
        code?: string;
        credits?: number | string;
        type?: string;
        handledBy?: string;
        hodEmployeeId?: string;
        hodName?: string;
        teachingFacultyIds?: string[];
        teachingFacultyNames?: string[];
        mentorFacultyIds?: string[];
        mentorFacultyNames?: string[];
      }>;
    };

    if (!body.campusId) {
      return NextResponse.json({ error: "campusId is required" }, { status: 400 });
    }
    const batchYear = Number(body.batchYear);
    const semester = Number(body.semester);

    if (!batchYear || !semester || semester < 1 || semester > 8) {
      return NextResponse.json(
        { error: "Valid batchYear and semester (1-8) are required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.subjects) || body.subjects.length === 0) {
      return NextResponse.json({ error: "At least one subject is required" }, { status: 400 });
    }

    const created = await Promise.all(
      body.subjects.map(async (subj) => {
        return devDb.semesterSubject.create({
          data: {
            campusId: body.campusId,
            batchYear,
            semester,
            name: subj.name.trim(),
            code: subj.code?.trim() || null,
            credits: subj.credits ? Number(subj.credits) : 3,
            type: subj.type || "Theory",
            handledBy: subj.handledBy || "University",
            hodEmployeeId: subj.hodEmployeeId?.trim() || null,
            hodName: subj.hodName?.trim() || null,
            teachingFacultyIds: Array.isArray(subj.teachingFacultyIds)
              ? subj.teachingFacultyIds
              : [],
            teachingFacultyNames: Array.isArray(subj.teachingFacultyNames)
              ? subj.teachingFacultyNames
              : [],
            mentorFacultyIds: Array.isArray(subj.mentorFacultyIds) ? subj.mentorFacultyIds : [],
            mentorFacultyNames: Array.isArray(subj.mentorFacultyNames)
              ? subj.mentorFacultyNames
              : [],
          },
          include: {
            campus: { select: { id: true, name: true, city: true } },
          },
        });
      }),
    );

    return NextResponse.json({ subjects: created, count: created.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save semester subjects", detail: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Subject id is required" }, { status: 400 });
  }

  try {
    await devDb.semesterSubject.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete subject", detail: String(err) },
      { status: 500 },
    );
  }
}
