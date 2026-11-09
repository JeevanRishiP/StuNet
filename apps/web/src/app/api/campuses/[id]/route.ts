import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const campus = await db.campus.findFirst({
      where: {
        OR: [{ id: params.id }, { slug: params.id }],
        isActive: true,
      },
      include: {
        faculties: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        clubs: {
          where: { isActive: true },
          include: {
            roleAssignments: {
              where: { revokedAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    headline: true,
                  },
                },
              },
            },
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
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                    headline: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
        liveAlerts: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        ciaSchedules: {
          orderBy: { scheduledAt: "asc" },
          take: 10,
        },
        iaExams: {
          orderBy: { scheduledAt: "asc" },
          take: 5,
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    return NextResponse.json({ campus });
  } catch (error) {
    console.error("Failed to load campus:", error);
    return NextResponse.json({ error: "Failed to load campus details" }, { status: 500 });
  }
}
