/**
 * Club membership API — Student Portal
 * POST   /api/clubs/[clubId]/members — join club
 * DELETE /api/clubs/[clubId]/members — leave club
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

interface Params {
  params: { clubId: string };
}

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(`club-join:${session.user.id}`, 30, 3600);
  if (limited) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const club = await db.club.findUnique({
    where: { id: params.clubId, isActive: true },
    select: { id: true, campusId: true },
  });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });

  // Verify the user is on the same campus
  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true },
  });
  if (user?.campusId !== club.campusId) {
    return NextResponse.json({ error: "You can only join clubs on your campus" }, { status: 403 });
  }

  // Upsert membership (re-join after leaving)
  const membership = await db.clubMember.upsert({
    where: { clubId_userId: { clubId: params.clubId, userId: session.user.id } },
    create: { clubId: params.clubId, userId: session.user.id, role: "MEMBER" },
    update: { isActive: true },
    select: { id: true, role: true },
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await db.clubMember.findUnique({
    where: { clubId_userId: { clubId: params.clubId, userId: session.user.id } },
  });

  if (!membership || !membership.isActive) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }

  // PRESIDENT cannot leave without transferring ownership — prevents orphaned clubs
  if (membership.role === "PRESIDENT") {
    return NextResponse.json(
      { error: "Presidents must transfer ownership before leaving" },
      { status: 409 },
    );
  }

  await db.clubMember.update({
    where: { clubId_userId: { clubId: params.clubId, userId: session.user.id } },
    data: { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
}
