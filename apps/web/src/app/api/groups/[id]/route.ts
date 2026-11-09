/**
 * Group Operations API — Edit Settings & Delete Group
 * PATCH  /api/groups/[id] — update group settings (owner only)
 * DELETE /api/groups/[id] — delete group permanently (owner only)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const UpdateGroupSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  purpose: z.string().min(5).max(1000).optional(),
  whatsappLink: z.string().url().optional(),
  visibility: z.enum(["PUBLIC", "REQUEST_REQUIRED"]).optional(),
  hideMembers: z.boolean().optional(),
});

interface Params {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await db.group.findUnique({ where: { id: params.id } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Owner verification
  if (group.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the group owner can update settings" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const dataToUpdate: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) dataToUpdate.name = parsed.data.name.trim();
  if (parsed.data.purpose !== undefined) dataToUpdate.description = parsed.data.purpose.trim();
  if (parsed.data.whatsappLink !== undefined)
    dataToUpdate.externalLinkUrl = parsed.data.whatsappLink.trim();
  if (parsed.data.visibility !== undefined) {
    dataToUpdate.type = parsed.data.visibility === "PUBLIC" ? "OPEN" : "CLOSED";
  }
  if (parsed.data.hideMembers !== undefined) dataToUpdate.hideMembers = parsed.data.hideMembers;

  const updated = await db.group.update({
    where: { id: params.id },
    data: dataToUpdate,
  });

  return NextResponse.json({ success: true, group: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const group = await db.group.findUnique({ where: { id: params.id } });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Owner verification
  if (group.ownerId !== userId) {
    return NextResponse.json(
      { error: "Only the group owner can delete this group" },
      { status: 403 },
    );
  }

  // In a transaction, delete all relations and the group record
  await db.$transaction(async (tx) => {
    // 1. Delete join requests
    await tx.groupJoinRequest.deleteMany({ where: { groupId: params.id } });
    // 2. Delete group members
    await tx.groupMember.deleteMany({ where: { groupId: params.id } });
    // 3. Delete group
    await tx.group.delete({ where: { id: params.id } });
  });

  return NextResponse.json({
    success: true,
    message: `Group '${group.name}' has been permanently deleted.`,
  });
}
