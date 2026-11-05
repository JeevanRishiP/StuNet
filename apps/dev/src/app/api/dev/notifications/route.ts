/**
 * GET  /api/dev/notifications?userId=&type=&isRead=
 * POST /api/dev/notifications — create notification
 * PATCH /api/dev/notifications — mark read/unread
 * DELETE /api/dev/notifications?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const userId = searchParams.get("userId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const isRead = searchParams.get("isRead");

  const where = {
    ...(userId ? { recipientId: userId } : {}),
    ...(type
      ? {
          type: type as
            | "CONNECTION_REQUEST"
            | "CONNECTION_ACCEPTED"
            | "POST_LIKE"
            | "POST_COMMENT"
            | "ACHIEVEMENT_VERIFIED"
            | "ACHIEVEMENT_REJECTED"
            | "CLUB_INVITE"
            | "CLUB_ROLE_ASSIGNED"
            | "CLUB_ROLE_REVOKED"
            | "SUGGESTION_VOTE"
            | "LIVE_ALERT"
            | "MARKET_INTEREST"
            | "REPORT_RESOLVED"
            | "SYSTEM",
        }
      : {}),
    ...(isRead !== null && isRead !== "" ? { isRead: isRead === "true" } : {}),
  };

  const [notifications, total] = await Promise.all([
    devDb.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        recipient: { select: { displayName: true, username: true } },
      },
    }),
    devDb.notification.count({ where }),
  ]);

  const mapped = notifications.map((n) => ({
    ...n,
    user: n.recipient,
  }));

  return NextResponse.json({ notifications: mapped, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const notification = await devDb.notification.create({
      data: {
        recipientId: ((body.recipientId as string) || (body.userId as string)) ?? "",
        type: body.type as
          | "CONNECTION_REQUEST"
          | "CONNECTION_ACCEPTED"
          | "POST_LIKE"
          | "POST_COMMENT"
          | "ACHIEVEMENT_VERIFIED"
          | "ACHIEVEMENT_REJECTED"
          | "CLUB_INVITE"
          | "CLUB_ROLE_ASSIGNED"
          | "CLUB_ROLE_REVOKED"
          | "SUGGESTION_VOTE"
          | "LIVE_ALERT"
          | "MARKET_INTEREST"
          | "REPORT_RESOLVED"
          | "SYSTEM",
        title: body.title as string,
        body: (body.body as string | null) ?? null,
        actionUrl: (body.actionUrl as string | null) ?? null,
      },
    });
    return NextResponse.json({ notification }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { id: string; isRead: boolean };

  try {
    const notification = await devDb.notification.update({
      where: { id: body.id },
      data: { isRead: body.isRead },
    });
    return NextResponse.json({ notification });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
