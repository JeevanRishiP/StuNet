import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { ClubMemberRole, UserRole } from "@prisma/client";

const AssignRoleSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum([
    "PRESIDENT",
    "VICE_PRESIDENT",
    "OPERATIONAL_HEAD",
    "OUTREACH_HEAD",
    "FINANCE_HEAD",
    "CREATIVE_DESIGN_HEAD",
    "SOCIAL_MEDIA_HEAD",
  ]),
});

const RevokeRoleSchema = z.object({
  clubId: z.string().min(1),
  userId: z.string().min(1),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clubs = await adminDb.club.findMany({
      where: { campusId: params.id, isActive: true },
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
    });

    return NextResponse.json({ clubs });
  } catch (error) {
    console.error("Failed to fetch campus clubs:", error);
    return NextResponse.json({ error: "Failed to fetch clubs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = AssignRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid assignment data", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { clubId, userId, role } = parsed.data;

    // Verify club belongs to this campus
    const club = await adminDb.club.findFirst({
      where: { id: clubId, campusId: params.id },
    });

    if (!club) {
      return NextResponse.json({ error: "Club not found in this campus" }, { status: 404 });
    }

    // Assign role to student
    const membership = await adminDb.clubMember.upsert({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      update: {
        role: role as ClubMemberRole,
        isActive: true,
      },
      create: {
        clubId,
        userId,
        role: role as ClubMemberRole,
        isActive: true,
      },
    });

    // Record audit role assignment
    await adminDb.clubRoleAssignment.create({
      data: {
        clubId,
        userId,
        role: role as ClubMemberRole,
        assignedById: session.user.id ?? "admin",
      },
    });

    // Promote student to CLUB_MANAGER if they are a STUDENT
    const targetUser = await adminDb.userIdentity.findUnique({ where: { id: userId } });
    if (targetUser && targetUser.role === UserRole.STUDENT) {
      await adminDb.userIdentity.update({
        where: { id: userId },
        data: { role: UserRole.CLUB_MANAGER },
      });
    }

    return NextResponse.json({
      success: true,
      membership,
      message: `Successfully assigned ${role} in ${club.name}!`,
    });
  } catch (error) {
    console.error("Failed to assign club role:", error);
    return NextResponse.json({ error: "Failed to assign club role" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, _context: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = RevokeRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid revocation data" }, { status: 400 });
    }

    const { clubId, userId } = parsed.data;

    await adminDb.clubMember.updateMany({
      where: { clubId, userId },
      data: { role: ClubMemberRole.MEMBER },
    });

    await adminDb.clubRoleAssignment.updateMany({
      where: { clubId, userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedById: session.user.id ?? "admin",
      },
    });

    return NextResponse.json({ success: true, message: "Club role revoked" });
  } catch (error) {
    console.error("Failed to revoke club role:", error);
    return NextResponse.json({ error: "Failed to revoke club role" }, { status: 500 });
  }
}
