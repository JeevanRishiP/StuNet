/**
 * Group Join Request Action API (Owner only)
 * PATCH /api/groups/[id]/requests/[requestId] — Accept or Decline join request
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const ActionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

interface Params {
  params: { id: string; requestId: string };
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await db.group.findUnique({
    where: { id: params.id },
    include: {
      members: { select: { userId: true } },
    },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the group owner can manage requests" },
      { status: 403 },
    );
  }

  const joinReq = await db.groupJoinRequest.findUnique({
    where: { id: params.requestId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  if (!joinReq || joinReq.groupId !== params.id) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  const newStatus = parsed.data.status;

  if (newStatus === "APPROVED") {
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
      // 1. Update request status
      await tx.groupJoinRequest.update({
        where: { id: params.requestId },
        data: { status: "APPROVED" },
      });

      // 2. Add user to GroupMember if not already there
      const existingMember = await tx.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: params.id,
            userId: joinReq.userId,
          },
        },
      });

      if (!existingMember) {
        await tx.groupMember.create({
          data: {
            groupId: params.id,
            userId: joinReq.userId,
            role: "MEMBER",
          },
        });

        // 3. Increment member count
        await tx.group.update({
          where: { id: params.id },
          data: { memberCount: { increment: 1 } },
        });
      }

      // 4. Mark the owner's GROUP_JOIN_REQUEST notification as read
      await tx.notification.updateMany({
        where: {
          recipientId: userId,
          type: "GROUP_JOIN_REQUEST",
          OR: [{ actionUrl: { contains: params.requestId } }, { body: { contains: group.name } }],
          isRead: false,
        },
        data: { isRead: true, readAt: now },
      });

      // 5. Notify applicant that request was approved
      await tx.notification.create({
        data: {
          recipientId: joinReq.userId,
          triggeredById: userId,
          type: "GROUP_INVITE",
          title: "Join Request Approved",
          body: `Your request to join "${group.name}" (#${group.shortCode || ""}) has been approved! You are now a member.`,
          actionUrl: "/network?tab=groups",
          isRead: false,
        },
      });

      // 6. Broadcast to EVERY group member (including the admin/owner) with date and time
      const allMembersToNotify = new Set(group.members.map((m) => m.userId));
      allMembersToNotify.add(group.ownerId);
      allMembersToNotify.delete(joinReq.userId);

      for (const recipientId of Array.from(allMembersToNotify)) {
        await tx.notification.create({
          data: {
            recipientId,
            triggeredById: joinReq.userId,
            type: "GROUP_INVITE",
            title: "New Member Joined",
            body: `${joinReq.user.displayName} joined "${group.name}" (#${group.shortCode || ""}) on ${dateTimeStr}.`,
            actionUrl: "/network?tab=groups",
            isRead: false,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      applicantName: joinReq.user.displayName,
      message: `${joinReq.user.displayName} has been admitted to '${group.name}'.`,
    });
  }

  // REJECTED
  await db.$transaction(async (tx) => {
    const now = new Date();
    await tx.groupJoinRequest.update({
      where: { id: params.requestId },
      data: { status: "REJECTED" },
    });

    await tx.notification.updateMany({
      where: {
        recipientId: userId,
        type: "GROUP_JOIN_REQUEST",
        OR: [{ actionUrl: { contains: params.requestId } }, { body: { contains: group.name } }],
        isRead: false,
      },
      data: { isRead: true, readAt: now },
    });

    await tx.notification.create({
      data: {
        recipientId: joinReq.userId,
        triggeredById: userId,
        type: "SYSTEM",
        title: "Join Request Declined",
        body: `Your request to join "${group.name}" was declined.`,
        actionUrl: "/network",
        isRead: false,
      },
    });
  });

  return NextResponse.json({
    success: true,
    status: "REJECTED",
    message: "Join request declined.",
  });
}
