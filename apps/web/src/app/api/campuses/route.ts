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
        clubs: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            members: {
              where: {
                role: {
                  in: [
                    "PRESIDENT",
                    "VICE_PRESIDENT",
                    "OPERATIONAL_HEAD",
                    "OUTREACH_HEAD",
                    "FINANCE_HEAD",
                    "CREATIVE_DESIGN_HEAD",
                    "SOCIAL_MEDIA_HEAD",
                  ],
                },
                isActive: true,
              },
              select: {
                role: true,
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    studentEmail: true,
                  },
                },
              },
            },
            roleAssignments: {
              where: { revokedAt: null },
              select: {
                role: true,
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    studentEmail: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ state: "asc" }, { city: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ campuses });
  } catch (err) {
    console.error("GET /api/campuses error:", err);
    return NextResponse.json({ error: "Failed to fetch campuses" }, { status: 500 });
  }
}
