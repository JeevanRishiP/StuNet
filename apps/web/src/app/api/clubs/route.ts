/**
 * Clubs API — Student Portal
 * GET /api/clubs — list clubs (filtered by campus of the logged-in user)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only show clubs from the user's campus
  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true },
  });

  const clubs = await db.club.findMany({
    where: {
      isActive: true,
      ...(user?.campusId ? { campusId: user.campusId } : {}),
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
      campus: { select: { name: true } },
      _count: { select: { members: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ clubs });
}
