/**
 * GET  /api/dev/connections?userId=&status=
 * POST /api/dev/connections
 * PATCH /api/dev/connections
 * DELETE /api/dev/connections?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const userId = searchParams.get("userId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const where = {
    ...(status ? { status: status as "PENDING" | "ACCEPTED" | "DECLINED" } : {}),
    ...(userId ? { OR: [{ senderId: userId }, { receiverId: userId }] } : {}),
  };

  const [connections, total] = await Promise.all([
    devDb.connection.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { displayName: true, username: true } },
        receiver: { select: { displayName: true, username: true } },
      },
    }),
    devDb.connection.count({ where }),
  ]);

  return NextResponse.json({ connections, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { senderId: string; receiverId: string; status?: string };

  try {
    const connection = await devDb.connection.create({
      data: {
        senderId: body.senderId,
        receiverId: body.receiverId,
        status: (body.status as "PENDING" | "ACCEPTED" | "DECLINED") ?? "PENDING",
      },
    });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { id: string; status: string };

  try {
    const connection = await devDb.connection.update({
      where: { id: body.id },
      data: { status: body.status as "PENDING" | "ACCEPTED" | "DECLINED" },
    });
    return NextResponse.json({ connection });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.connection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
