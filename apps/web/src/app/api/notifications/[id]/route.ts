import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/notifications/[id] — mark a single notification as read
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  // Ownership check: only the recipient can mark their own notification
  const existing = await db.notification.findUnique({
    where: { id },
    select: { recipientId: true, isRead: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.recipientId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (existing.isRead) {
    return NextResponse.json({ alreadyRead: true });
  }

  const now = new Date();

  await db.notification.update({
    where: { id },
    data: { isRead: true, readAt: now },
  });

  return NextResponse.json({ ok: true });
}
