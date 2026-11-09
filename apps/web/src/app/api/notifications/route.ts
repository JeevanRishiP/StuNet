import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PAGE_SIZE = 20;

// GET /api/notifications — cursor-paginated unread notifications
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const unreadOnly = searchParams.get("unread") !== "false";

  const notifications = await db.notification.findMany({
    where: {
      recipientId: session.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      actionUrl: true,
      isRead: true,
      createdAt: true,
      triggeredBy: {
        select: {
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > PAGE_SIZE;
  const items = hasMore ? notifications.slice(0, PAGE_SIZE) : notifications;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  // Unread count (fast — index-covered)
  const unreadCount = await db.notification.count({
    where: { recipientId: session.user.id, isRead: false },
  });

  // Network-specific unread count (connection requests & accepts, group invites & join requests, club invites)
  const networkNotifsUnread = await db.notification.count({
    where: {
      recipientId: session.user.id,
      isRead: false,
      type: {
        in: [
          "CONNECTION_REQUEST",
          "CONNECTION_ACCEPTED",
          "GROUP_INVITE",
          "GROUP_JOIN_REQUEST",
          "CLUB_INVITE",
        ],
      },
    },
  });

  const pendingReceivedConnections = await db.connection.count({
    where: {
      receiverId: session.user.id,
      status: "PENDING",
    },
  });

  const networkUnreadCount = Math.max(networkNotifsUnread, pendingReceivedConnections);

  return NextResponse.json({ notifications: items, nextCursor, unreadCount, networkUnreadCount });
}

// PATCH /api/notifications — mark ALL as read
export async function PATCH(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const result = await db.notification.updateMany({
    where: { recipientId: session.user.id, isRead: false },
    data: { isRead: true, readAt: now },
  });

  return NextResponse.json({ marked: result.count });
}
