/**
 * Club detail API — Student Portal
 * GET /api/clubs/[clubId] — get club detail + membership status
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: { clubId: string };
}

export async function GET(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findUnique({
    where: { id: params.clubId, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      logoUrl: true,
      bannerUrl: true,
      institutionalEmail: true,
      campus: { select: { name: true } },
      _count: { select: { members: { where: { isActive: true } } } },
    },
  });

  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Viewer's membership
  const membership = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: params.clubId, userId: session.user.id } },
    select: { role: true, isActive: true },
  });

  return NextResponse.json({
    club,
    membership: membership?.isActive ? { role: membership.role } : null,
  });
}
