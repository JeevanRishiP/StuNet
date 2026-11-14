import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { OpenSourceProjectSchema } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const sortBy = url.searchParams.get("sortBy") ?? "impact"; // "impact" | "stars" | "contributors" | "recent"
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

  const whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tagline: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { primaryLanguage: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, "asc" | "desc"> = { starsCount: "desc" };
  if (sortBy === "contributors") {
    orderBy = { contributorsCount: "desc" };
  } else if (sortBy === "recent") {
    orderBy = { createdAt: "desc" };
  }

  const projects = await db.openSourceProject.findMany({
    where: whereClause,
    orderBy: [orderBy, { createdAt: "desc" }],
    take: limit,
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
        },
      },
      members: {
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
        orderBy: { createdAt: "asc" },
      },
      links: true,
      _count: {
        select: {
          followers: true,
          posts: true,
          opportunities: true,
        },
      },
      ...(viewerId
        ? {
            followers: {
              where: { userId: viewerId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  const formatted = projects.map((p) => {
    const viewerFollow = viewerId && p.followers && p.followers.length > 0;
    const isOwner = viewerId ? p.ownerUserId === viewerId : false;
    const memberObj = viewerId ? p.members.find((m) => m.userId === viewerId) : null;
    const isMaintainer = isOwner || memberObj?.role === "MAINTAINER";

    // Community Impact Score calculation:
    // (stars * 3) + (contributors * 10) + (forks * 5)
    const impactScore = p.starsCount * 3 + p.contributorsCount * 10 + p.forksCount * 5;

    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      logoUrl: p.logoUrl,
      githubUrl: p.githubUrl,
      starsCount: p.starsCount,
      contributorsCount: p.contributorsCount,
      forksCount: p.forksCount,
      primaryLanguage: p.primaryLanguage,
      license: p.license,
      isOpenForContributors: p.isOpenForContributors,
      impactScore,
      createdAt: p.createdAt,
      owner: p.owner,
      links: p.links,
      followersCount: p._count.followers,
      postsCount: p._count.posts,
      opportunitiesCount: p._count.opportunities,
      members: p.members.map((m) => ({
        userId: m.userId,
        name: m.user.displayName,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        position: m.position,
      })),
      viewerHasFollowed: Boolean(viewerFollow),
      viewerIsMaintainer: isMaintainer,
      canPost: isMaintainer,
      canManageTeam: isMaintainer,
    };
  });

  if (sortBy === "impact") {
    formatted.sort((a, b) => b.impactScore - a.impactScore);
  }

  const ranked = formatted.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));

  return NextResponse.json({ items: ranked });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = OpenSourceProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const {
    name,
    tagline,
    description,
    logoUrl,
    githubUrl,
    starsCount,
    contributorsCount,
    forksCount,
    primaryLanguage,
    license,
    isOpenForContributors,
    links,
  } = parsed.data;

  const project = await db.$transaction(async (tx) => {
    const created = await tx.openSourceProject.create({
      data: {
        ownerUserId: userId,
        name,
        tagline: tagline || null,
        description: description || null,
        logoUrl: logoUrl || null,
        githubUrl,
        syncedStars: starsCount,
        starsCount: starsCount ?? 0,
        contributorsCount: contributorsCount ?? 1,
        forksCount: forksCount ?? 0,
        primaryLanguage: primaryLanguage || null,
        license: license || "MIT",
        isOpenForContributors: isOpenForContributors ?? true,
        links:
          links && links.length > 0
            ? {
                create: links.map((l) => ({
                  name: l.name,
                  url: l.url,
                })),
              }
            : undefined,
      },
    });

    // Add creator as Maintainer
    await tx.projectMember.create({
      data: {
        userId,
        projectId: created.id,
        role: "MAINTAINER",
        position: "Lead Maintainer",
      },
    });

    // Follow project for owner
    await tx.projectFollow.create({
      data: {
        userId,
        projectId: created.id,
      },
    });

    return created;
  });

  return NextResponse.json({ success: true, project }, { status: 201 });
}
