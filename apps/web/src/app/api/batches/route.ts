import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const { searchParams } = new URL(req.url);
  const campusId = searchParams.get("campusId") || session?.user?.campusId;

  try {
    const batches = await db.campusBatch.findMany({
      where: campusId ? { campusId } : {},
      select: {
        id: true,
        year: true,
        degree: true,
        sections: true,
        numberOfStudents: true,
        numberOfSections: true,
        campus: { select: { id: true, name: true } },
      },
      orderBy: { year: "desc" },
    });

    return NextResponse.json({ batches });
  } catch (err) {
    console.error("GET /api/batches error:", err);
    return NextResponse.json({ batches: [] });
  }
}
