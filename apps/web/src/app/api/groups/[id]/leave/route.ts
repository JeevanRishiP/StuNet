/**
 * Group Membership API — Exit / Leave Group
 * POST /api/groups/[id]/leave — member exits group and updates database
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

interface Params {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await db.group.findUnique({
    where: { id: params.id },
    include: {
      members: { where: { userId } },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.ownerId === userId) {
    return NextResponse.json(
      { error: "As group owner, you cannot exit your own group. Use Delete Group instead." },
      { status: 400 },
    );
  }

  const isMember = group.members.length > 0;
  if (!isMember) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    // 1. Remove member record
    await tx.groupMember.deleteMany({
      where: {
        groupId: params.id,
        userId,
      },
    });

    // 2. Decrement group member count (never below 1)
    await tx.group.update({
      where: { id: params.id },
      data: {
        memberCount: Math.max(1, group.memberCount - 1),
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: `You have exited '${group.name}'.`,
  });
}
