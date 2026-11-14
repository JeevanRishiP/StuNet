import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;

  // Find companies where user is FOUNDER or CO_FOUNDER
  const companyRoles = await db.userCompanyRole.findMany({
    where: {
      userId,
      ownerType: { in: ["FOUNDER", "CO_FOUNDER"] },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
          verifiedRevenue: true,
          isRevenueVerified: true,
        },
      },
    },
  });

  const companyIds = companyRoles.map((cr) => cr.company.id);

  // Find projects where user is owner or maintainer
  const ownedProjects = await db.openSourceProject.findMany({
    where: { ownerUserId: userId },
    select: { id: true, name: true, logoUrl: true, starsCount: true },
  });

  const memberProjects = await db.projectMember.findMany({
    where: { userId, role: "MAINTAINER" },
    select: { projectId: true },
  });

  const projectIds = Array.from(
    new Set([...ownedProjects.map((p) => p.id), ...memberProjects.map((m) => m.projectId)]),
  );

  if (companyIds.length === 0 && projectIds.length === 0) {
    return NextResponse.json({
      hasInitiatives: false,
      companies: [],
      projects: [],
      requests: [],
    });
  }

  // Fetch all incoming interest requests
  const requests = await db.initiativeInterestRequest.findMany({
    where: {
      OR: [{ companyId: { in: companyIds } }, { projectId: { in: projectIds } }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          headline: true,
          role: true,
          campus: { select: { name: true, slug: true } },
        },
      },
      company: {
        select: { id: true, name: true, logoUrl: true },
      },
      project: {
        select: { id: true, name: true, logoUrl: true },
      },
    },
  });

  return NextResponse.json({
    hasInitiatives: true,
    companies: companyRoles.map((cr) => ({ ...cr.company, role: cr.ownerType })),
    projects: ownedProjects,
    requests,
  });
}
