import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const UpdateCampusSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  universityName: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  emailDomain: z.string().max(100).optional(),
  websiteUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  facilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const campus = await adminDb.campus.findUnique({
      where: { id },
      include: {
        faculties: {
          orderBy: { createdAt: "asc" },
        },
        clubs: {
          include: {
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
              },
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        },
        liveAlerts: {
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
        _count: {
          select: {
            userIdentities: true,
          },
        },
      },
    });

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 });
    }

    return NextResponse.json({ campus });
  } catch (error) {
    console.error("Failed to fetch campus details:", error);
    return NextResponse.json({ error: "Failed to fetch campus details" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const body = await req.json();
    const parsed = UpdateCampusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const updated = await adminDb.campus.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, campus: updated });
  } catch (error) {
    console.error("Failed to update campus:", error);
    return NextResponse.json({ error: "Failed to update campus" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const updated = await adminDb.campus.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "Campus deactivated", campus: updated });
  } catch (error) {
    console.error("Failed to deactivate campus:", error);
    return NextResponse.json({ error: "Failed to deactivate campus" }, { status: 500 });
  }
}
