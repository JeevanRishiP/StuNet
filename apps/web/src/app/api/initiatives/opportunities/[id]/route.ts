import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdateOpportunitySchema = z.object({
  title: z.string().min(2).max(200).trim().optional(),
  description: z.string().min(10).max(5000).trim().optional(),
  skills: z.array(z.string().trim().max(50)).optional(),
  compensation: z.string().max(200).optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  applyUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const oppId = params.id;

  const opportunity = await db.initiativeOpportunity.findUnique({
    where: { id: oppId },
    include: {
      company: {
        include: {
          roles: {
            where: { userId },
          },
        },
      },
      project: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCreator = opportunity.creatorId === userId;
  const isCompanyLeader =
    opportunity.company?.roles.some(
      (r) => r.ownerType === "FOUNDER" || r.ownerType === "CO_FOUNDER",
    ) ?? false;
  const isProjectLeader =
    opportunity.project?.ownerUserId === userId ||
    (opportunity.project?.members.some((m) => m.role === "MAINTAINER") ?? false);

  if (!isCreator && !isCompanyLeader && !isProjectLeader && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized to edit this opportunity." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const updated = await db.initiativeOpportunity.update({
    where: { id: oppId },
    data: parsed.data,
  });

  return NextResponse.json({ success: true, opportunity: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const oppId = params.id;

  const opportunity = await db.initiativeOpportunity.findUnique({
    where: { id: oppId },
    include: {
      company: {
        include: {
          roles: {
            where: { userId },
          },
        },
      },
      project: {
        include: {
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!opportunity) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCreator = opportunity.creatorId === userId;
  const isCompanyLeader =
    opportunity.company?.roles.some(
      (r) => r.ownerType === "FOUNDER" || r.ownerType === "CO_FOUNDER",
    ) ?? false;
  const isProjectLeader =
    opportunity.project?.ownerUserId === userId ||
    (opportunity.project?.members.some((m) => m.role === "MAINTAINER") ?? false);

  if (!isCreator && !isCompanyLeader && !isProjectLeader && !isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized to delete this opportunity." },
      { status: 403 },
    );
  }

  await db.initiativeOpportunity.delete({
    where: { id: oppId },
  });

  return NextResponse.json({ success: true, deletedId: oppId });
}
