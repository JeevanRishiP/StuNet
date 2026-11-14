import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { CreateOpportunitySchema, OpportunityRoleTypeEnum } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // "company" | "project" | null
  const roleType = url.searchParams.get("roleType");
  const companyId = url.searchParams.get("companyId");
  const projectId = url.searchParams.get("projectId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

  const whereClause: Record<string, unknown> = {
    isActive: true,
  };

  if (companyId) whereClause.companyId = companyId;
  if (projectId) whereClause.projectId = projectId;

  if (type === "company") {
    whereClause.companyId = { not: null };
  } else if (type === "project") {
    whereClause.projectId = { not: null };
  }

  if (roleType && Object.values(OpportunityRoleTypeEnum.enum).includes(roleType as any)) {
    whereClause.roleType = roleType;
  }

  const opportunities = await db.initiativeOpportunity.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
          tagline: true,
          verifiedRevenue: true,
          isRevenueVerified: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          tagline: true,
          githubUrl: true,
          primaryLanguage: true,
          starsCount: true,
        },
      },
      creator: {
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

  return NextResponse.json({ items: opportunities });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid opportunity data" },
      { status: 422 },
    );
  }

  const {
    companyId,
    projectId,
    title,
    roleType,
    description,
    skills,
    compensation,
    contactEmail,
    applyUrl,
  } = parsed.data;

  if (!companyId && !projectId) {
    return NextResponse.json(
      { error: "Must specify either a company or open source project for this opportunity." },
      { status: 422 },
    );
  }

  // Permission checks
  if (companyId) {
    const role = await db.userCompanyRole.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId,
        },
      },
    });

    if ((!role || (role.ownerType !== "FOUNDER" && role.ownerType !== "CO_FOUNDER")) && !isAdmin) {
      return NextResponse.json(
        { error: "Only founders and co-founders can post opportunities for this company." },
        { status: 403 },
      );
    }
  }

  if (projectId) {
    const project = await db.openSourceProject.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    const isMaintainer =
      project?.ownerUserId === userId || project?.members.some((m) => m.role === "MAINTAINER");

    if (!isMaintainer && !isAdmin) {
      return NextResponse.json(
        { error: "Only project maintainers can post opportunities for this project." },
        { status: 403 },
      );
    }
  }

  const opportunity = await db.initiativeOpportunity.create({
    data: {
      creatorId: userId,
      companyId: companyId || null,
      projectId: projectId || null,
      title,
      roleType,
      description,
      skills: skills ?? [],
      compensation: compensation || null,
      contactEmail: contactEmail || null,
      applyUrl: applyUrl || null,
      isActive: true,
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          primaryLanguage: true,
        },
      },
    },
  });

  // If company, update hiringStatus = true
  if (companyId) {
    await db.company.update({
      where: { id: companyId },
      data: { hiringStatus: true },
    });
  }

  return NextResponse.json({ success: true, opportunity }, { status: 201 });
}
