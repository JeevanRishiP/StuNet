/**
 * Group Join & Request API
 * POST /api/groups/[id]/join — join group or request access
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const JoinSchema = z.object({
  purpose: z.string().max(500).optional(),
  fromInvite: z.boolean().optional(),
});

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const alreadyMember = group.members.some((m) => m.userId === userId);
  if (alreadyMember) {
    return NextResponse.json({ error: "You are already a member of this group" }, { status: 409 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  const parsed = JoinSchema.safeParse(body);
  const purpose = parsed.success ? parsed.data.purpose : undefined;
  const fromInvite = parsed.success ? parsed.data.fromInvite : false;

  // Check if user has an active invite notification for this group
  const pendingInvite = await db.notification.findFirst({
    where: {
      recipientId: userId,
      type: "GROUP_INVITE",
      OR: [{ actionUrl: { contains: params.id } }, { body: { contains: group.name } }],
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
  });

  const canJoinDirectly = group.type === "OPEN" || fromInvite || Boolean(pendingInvite);

  const joiningUser = await db.userIdentity.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, username: true },
  });
  const displayName = joiningUser?.displayName || "A fellow member";

  if (canJoinDirectly) {
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const dateTimeStr = `${formattedDate} at ${formattedTime}`;

    await db.$transaction(async (tx) => {
      // 1. Add to group members
      await tx.groupMember.create({
        data: {
          groupId: params.id,
          userId,
          role: "MEMBER",
        },
      });

      // 2. Increment member count
      await tx.group.update({
        where: { id: params.id },
        data: { memberCount: { increment: 1 } },
      });

      // 3. If there was an invite notification, mark it as read
      if (pendingInvite) {
        await tx.notification.update({
          where: { id: pendingInvite.id },
          data: { isRead: true, readAt: now },
        });
      }

      // 4. If this was an invite acceptance, notify group owner specifically about acceptance
      if (pendingInvite || fromInvite) {
        if (group.ownerId !== userId) {
          await tx.notification.create({
            data: {
              recipientId: group.ownerId,
              triggeredById: userId,
              type: "GROUP_INVITE",
              title: "Group Invitation Accepted",
              body: `${displayName} accepted the invitation and joined "${group.name}".`,
              actionUrl: `/network?tab=groups`,
              isRead: false,
            },
          });
        }
      }

      // 5. Notify EVERY other group member with date and time
      const allMembersToNotify = new Set(group.members.map((m) => m.userId));
      allMembersToNotify.add(group.ownerId);
      allMembersToNotify.delete(userId);
      if (pendingInvite || fromInvite) {
        allMembersToNotify.delete(group.ownerId);
      }

      for (const recipientId of Array.from(allMembersToNotify)) {
        await tx.notification.create({
          data: {
            recipientId,
            triggeredById: userId,
            type: "GROUP_INVITE",
            title: "New Member Joined",
            body: `${displayName} joined "${group.name}" (#${group.shortCode || ""}) on ${dateTimeStr}.`,
            actionUrl: `/network?tab=groups`,
            isRead: false,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      status: "JOINED",
      whatsappLink: group.externalLinkUrl,
      message: `Successfully joined '${group.name}'.`,
    });
  }

  // Request required for closed group
  const existingRequest = await db.groupJoinRequest.findFirst({
    where: {
      groupId: params.id,
      userId,
      status: "PENDING",
    },
  });

  if (existingRequest) {
    return NextResponse.json({
      success: true,
      status: "PENDING",
      message: "You already have a pending join request for this group.",
    });
  }

  const createdRequest = await db.groupJoinRequest.create({
    data: {
      groupId: params.id,
      userId,
      purpose,
      status: "PENDING",
    },
  });

  // Notify group owner of join request
  await db.notification.create({
    data: {
      recipientId: group.ownerId,
      triggeredById: userId,
      type: "GROUP_JOIN_REQUEST",
      title: "Group Join Request",
      body: `${displayName} requested to join your group "${group.name}".`,
      actionUrl: `/network?tab=groups&groupId=${params.id}&requestId=${createdRequest.id}`,
      isRead: false,
    },
  });

  return NextResponse.json({
    success: true,
    status: "REQUESTED",
    requestId: createdRequest.id,
    message: "Join request submitted to group administrator.",
  });
}
