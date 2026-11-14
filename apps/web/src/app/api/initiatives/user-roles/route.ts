import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ companies: [], projects: [] });
  }

  // Get companies where user is FOUNDER or CO_FOUNDER
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
        },
      },
    },
  });

  // Get projects where user is owner or MAINTAINER
  const ownedProjects = await db.openSourceProject.findMany({
    where: { ownerUserId: userId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      primaryLanguage: true,
    },
  });

  const memberProjects = await db.projectMember.findMany({
    where: {
      userId,
      role: "MAINTAINER",
    },
    include: {
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

  const allProjectsMap = new Map<
    string,
    { id: string; name: string; logoUrl?: string | null; primaryLanguage?: string | null }
  >();
  for (const p of ownedProjects) {
    allProjectsMap.set(p.id, p);
  }
  for (const m of memberProjects) {
    allProjectsMap.set(m.project.id, m.project);
  }

  return NextResponse.json({
    companies: companyRoles.map((r) => ({
      ...r.company,
      role: r.ownerType,
    })),
    projects: Array.from(allProjectsMap.values()),
  });
}
