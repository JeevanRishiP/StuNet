/**
 * Club detail API — Student Portal
 * GET /api/clubs/[clubId] — get club detail + leadership + membership status
 * Handles both clubId (cuid) and slug (e.g. "nsgc", "advanced-tech", etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_SVYASA_CAMPUS_ID = "cmw0t9cgf0005yq6sgrcz4tpy";

interface Params {
  params: { clubId: string };
}

const CLUB_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  logoUrl: true,
  bannerUrl: true,
  institutionalEmail: true,
  instagramUrl: true,
  campusId: true,
  campus: { select: { id: true, name: true, slug: true } },
  roleAssignments: {
    where: { revokedAt: null },
    select: {
      id: true,
      role: true,
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
  _count: { select: { members: { where: { isActive: true } } } },
};

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();

  let targetCampusId = DEFAULT_SVYASA_CAMPUS_ID;
  if (session?.user?.id) {
    const user = await db.userIdentity.findUnique({
      where: { id: session.user.id },
      select: { campusId: true },
    });
    if (user?.campusId) {
      targetCampusId = user.campusId;
    }
  }

  // 1. Try to find by id first (if clubId matches a database id)
  let club = await db.club.findFirst({
    where: { id: params.clubId, isActive: true },
    select: CLUB_SELECT,
  });

  // 2. Try to find by slug scoped to the user's campus / S-VYASA default
  if (!club) {
    club = await db.club.findFirst({
      where: {
        slug: params.clubId,
        campusId: targetCampusId,
        isActive: true,
      },
      select: CLUB_SELECT,
    });
  }

  // 3. Fallback to any campus with that slug
  if (!club) {
    club = await db.club.findFirst({
      where: { slug: params.clubId, isActive: true },
      select: CLUB_SELECT,
    });
  }

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  // Viewer's membership
  let membership = null;
  if (session?.user?.id) {
    membership = await db.clubMember.findUnique({
      where: { clubId_userId: { clubId: club.id, userId: session.user.id } },
      select: { role: true, isActive: true },
    });
  }

  return NextResponse.json({
    club,
    membership: membership?.isActive ? { role: membership.role } : null,
  });
}
