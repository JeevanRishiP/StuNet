/**
 * Clubs API — Student Portal
 * GET /api/clubs — list clubs (filtered by campus of the logged-in user or S-VYASA default)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const DEFAULT_SVYASA_CAMPUS_ID = "cmw0t9cgf0005yq6sgrcz4tpy";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();

  // Find user's campus or fallback to S-VYASA
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

  const clubs = await db.club.findMany({
    where: {
      isActive: true,
      campusId: targetCampusId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      logoUrl: true,
      bannerUrl: true,
      campusId: true,
      institutionalEmail: true,
      campus: { select: { name: true } },
      roleAssignments: {
        where: { role: "PRESIDENT", revokedAt: null },
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
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ clubs });
}
