import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { CompanyOwnerTypeEnum } from "@stunet/types";
import { z } from "zod";

const AddMemberSchema = z.object({
  usernameOrId: z.string().min(1).trim(),
  ownerType: CompanyOwnerTypeEnum.default("EMPLOYEE"),
  position: z.string().max(100).optional(),
});

const UpdateMemberSchema = z.object({
  userId: z.string().min(1),
  ownerType: CompanyOwnerTypeEnum.optional(),
  position: z.string().max(100).optional(),
});

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
  const companyId = params.id;

  // Caller MUST be FOUNDER or CO_FOUNDER
  const callerRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId: actorId,
        companyId,
      },
    },
  });

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  if (
    (!callerRole ||
      (callerRole.ownerType !== "FOUNDER" && callerRole.ownerType !== "CO_FOUNDER")) &&
    !isAdmin
  ) {
    return NextResponse.json(
      { error: "Only the founder or co-founders can add or manage company team members." },
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

  const { usernameOrId, ownerType, position } = parsed.data;

  // Find target user by username or ID
  const targetUser = await db.userIdentity.findFirst({
    where: {
      OR: [{ id: usernameOrId }, { username: usernameOrId.toLowerCase().trim() }],
    },
    select: { id: true, displayName: true, username: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { error: "User not found. Please verify the username or User ID." },
      { status: 404 },
    );
  }

  // Check if user is already a member
  const existingRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId: targetUser.id,
        companyId,
      },
    },
  });

  if (existingRole) {
    return NextResponse.json(
      { error: `${targetUser.displayName} is already a member of this company.` },
      { status: 409 },
    );
  }

  // Only the FOUNDER can appoint someone as CO_FOUNDER or FOUNDER
  if (ownerType === "FOUNDER" || ownerType === "CO_FOUNDER") {
    if (callerRole?.ownerType !== "FOUNDER" && !isAdmin) {
      return NextResponse.json(
        { error: "Only the primary founder can appoint co-founders." },
        { status: 403 },
      );
    }
  }

  const createdRole = await db.userCompanyRole.create({
    data: {
      userId: targetUser.id,
      companyId,
      ownerType,
      position: position || (ownerType === "CO_FOUNDER" ? "Co-Founder" : "Team Member"),
      showOnProfile: true,
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

  return NextResponse.json({ success: true, member: createdRole }, { status: 201 });
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
  const companyId = params.id;

  const callerRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId: actorId,
        companyId,
      },
    },
  });

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  if (
    (!callerRole ||
      (callerRole.ownerType !== "FOUNDER" && callerRole.ownerType !== "CO_FOUNDER")) &&
    !isAdmin
  ) {
    return NextResponse.json(
      { error: "Only the founder or co-founders can edit company team members." },
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

  const { userId, ownerType, position } = parsed.data;

  const targetRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  if (!targetRole) {
    return NextResponse.json({ error: "Member not found in this company." }, { status: 404 });
  }

  // Protecting the original founder: Co-founders cannot edit the Founder's role
  if (targetRole.ownerType === "FOUNDER" && callerRole?.ownerType !== "FOUNDER" && !isAdmin) {
    return NextResponse.json(
      { error: "Co-founders cannot modify the primary founder's role." },
      { status: 403 },
    );
  }

  const updated = await db.userCompanyRole.update({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
    data: {
      ...(ownerType ? { ownerType } : {}),
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
  const companyId = params.id;

  const callerRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId: actorId,
        companyId,
      },
    },
  });

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  if (
    (!callerRole ||
      (callerRole.ownerType !== "FOUNDER" && callerRole.ownerType !== "CO_FOUNDER")) &&
    !isAdmin
  ) {
    return NextResponse.json(
      { error: "Only the founder or co-founders can remove company members." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const targetRole = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId: targetUserId,
        companyId,
      },
    },
  });

  if (!targetRole) {
    return NextResponse.json({ error: "Member not found in this company." }, { status: 404 });
  }

  // Founder cannot be removed
  if (targetRole.ownerType === "FOUNDER" && !isAdmin) {
    return NextResponse.json(
      { error: "The primary founder cannot be removed from the company." },
      { status: 400 },
    );
  }

  await db.userCompanyRole.delete({
    where: {
      userId_companyId: {
        userId: targetUserId,
        companyId,
      },
    },
  });

  return NextResponse.json({ success: true, removedUserId: targetUserId });
}
