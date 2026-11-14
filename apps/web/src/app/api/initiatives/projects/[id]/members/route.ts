import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { ProjectMemberRoleEnum } from "@stunet/types";
import { z } from "zod";

const AddMemberSchema = z.object({
  usernameOrId: z.string().min(1).trim(),
  role: ProjectMemberRoleEnum.default("CONTRIBUTOR"),
  position: z.string().max(100).optional(),
});

const UpdateMemberSchema = z.object({
  userId: z.string().min(1),
  role: ProjectMemberRoleEnum.optional(),
  position: z.string().max(100).optional(),
});

async function checkIsMaintainer(userId: string, projectId: string, isAdmin = false) {
  if (isAdmin) return true;
  const project = await db.openSourceProject.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId },
      },
    },
  });
  if (!project) return false;
  return project.ownerUserId === userId || project.members.some((m) => m.role === "MAINTAINER");
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const actorId = actorCheck.user.id;
  const projectId = params.id;
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  const isMaintainer = await checkIsMaintainer(actorId, projectId, isAdmin);
  if (!isMaintainer) {
    return NextResponse.json(
      { error: "Only project maintainers can add team members or contributors." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = AddMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { usernameOrId, role, position } = parsed.data;

  const targetUser = await db.userIdentity.findFirst({
    where: {
      OR: [{ id: usernameOrId }, { username: usernameOrId.toLowerCase().trim() }],
    },
    select: { id: true, displayName: true, username: true },
  });

  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const existingMember = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId: targetUser.id,
        projectId,
      },
    },
  });

  if (existingMember) {
    return NextResponse.json(
      { error: `${targetUser.displayName} is already a member of this project.` },
      { status: 409 },
    );
  }

  const newMember = await db.projectMember.create({
    data: {
      userId: targetUser.id,
      projectId,
      role,
      position: position || (role === "CORE_CONTRIBUTOR" ? "Core Contributor" : "Contributor"),
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
    },
  });

  // Increment contributors count
  await db.openSourceProject.update({
    where: { id: projectId },
    data: { contributorsCount: { increment: 1 } },
  });

  return NextResponse.json({ success: true, member: newMember }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const actorId = actorCheck.user.id;
  const projectId = params.id;
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  const isMaintainer = await checkIsMaintainer(actorId, projectId, isAdmin);
  if (!isMaintainer) {
    return NextResponse.json(
      { error: "Only project maintainers can edit member details." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { userId, role, position } = parsed.data;

  const targetMember = await db.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (!targetMember) {
    return NextResponse.json({ error: "Member not found in this project." }, { status: 404 });
  }

  const updated = await db.projectMember.update({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
    data: {
      ...(role ? { role } : {}),
      ...(position !== undefined ? { position } : {}),
    },
  });

  return NextResponse.json({ success: true, member: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const actorId = actorCheck.user.id;
  const projectId = params.id;
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  const isMaintainer = await checkIsMaintainer(actorId, projectId, isAdmin);
  if (!isMaintainer) {
    return NextResponse.json(
      { error: "Only project maintainers can remove members." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  const project = await db.openSourceProject.findUnique({
    where: { id: projectId },
  });

  if (project?.ownerUserId === targetUserId && !isAdmin) {
    return NextResponse.json(
      { error: "The project owner/creator cannot be removed." },
      { status: 400 },
    );
  }

  await db.projectMember.delete({
    where: {
      userId_projectId: {
        userId: targetUserId,
        projectId,
      },
    },
  });

  // Decrement contributors count (min 1)
  await db.openSourceProject.update({
    where: { id: projectId },
    data: {
      contributorsCount: {
        decrement: (project?.contributorsCount ?? 1) > 1 ? 1 : 0,
      },
    },
  });

  return NextResponse.json({ success: true, removedUserId: targetUserId });
}
