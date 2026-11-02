/**
 * PATCH /api/connections/[id]  — accept or decline a connection request
 * DELETE /api/connections/[id] — remove an accepted connection
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 422 });

  const connection = await db.connection.findUnique({ where: { id: params.id } });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only the receiver can accept/decline
  if (connection.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (connection.status !== "PENDING") {
    return NextResponse.json({ error: "Connection is no longer pending" }, { status: 409 });
  }

  const updated = await db.connection.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connection = await db.connection.findUnique({ where: { id: params.id } });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Either party can remove a connection
  if (connection.senderId !== session.user.id && connection.receiverId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.connection.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
