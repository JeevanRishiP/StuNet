import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const campuses = await db.campus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        universityName: true,
        slug: true,
        city: true,
        state: true,
        emailDomain: true,
      },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ campuses });
  } catch (err) {
    console.error("GET /api/campuses error:", err);
    return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
  }
}
