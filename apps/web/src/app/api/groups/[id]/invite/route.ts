import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const InviteSchema = z.object({
  targetUserId: z.string().min(1),
});

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const callerId = session?.user?.id;
  if (!callerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { targetUserId } = parsed.data;

  // 1. Fetch group
  const group = await db.group.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, displayName: true } },
      members: { select: { userId: true } },
    },
  });

  if (!group || !group.isActive) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // 2. Permission check: Caller must be owner or member
  const isOwner = group.ownerId === callerId;
  const isMember = group.members.some((m) => m.userId === callerId);
  if (!isOwner && !isMember) {
    return NextResponse.json(
      { error: "Only group members or owners can send invitations." },
      { status: 403 },
    );
  }

  // 3. Target user existence check
  const targetUser = await db.userIdentity.findUnique({
    where: { id: targetUserId },
    select: { id: true, displayName: true, username: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "Recipient user not found." }, { status: 404 });
  }

  // 4. Already member check
  const alreadyMember = group.members.some((m) => m.userId === targetUserId);
  if (alreadyMember) {
    return NextResponse.json(
      { error: `${targetUser.displayName} is already a member of this group.` },
      { status: 409 },
    );
  }

  // 5. Fetch sender details
  const sender = await db.userIdentity.findUnique({
    where: { id: callerId },
    select: { id: true, displayName: true, username: true },
  });

  // 6. Create persistent notification in DB for target user
  const notification = await db.notification.create({
    data: {
      recipientId: targetUserId,
      triggeredById: callerId,
      type: "GROUP_INVITE",
      title: "Group Invitation",
      body: `${sender?.displayName || "A peer"} invited you to join "${group.name}" (#${group.shortCode || ""}).`,
      actionUrl: `/network?tab=groups&joinGroup=${group.id}`,
      isRead: false,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: `Invitation sent to ${targetUser.displayName}.`,
      notificationId: notification.id,
    },
    { status: 201 },
  );
}
