import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const url = new URL(req.url);
  const audience = url.searchParams.get("audience") ?? "all"; // "all" | "student" | "alumni"
  const section = url.searchParams.get("section") ?? "all"; // "all" | "company" | "project"

  // Role filter condition
  const roleCondition =
    audience === "student"
      ? { role: "STUDENT" as const }
      : audience === "alumni"
        ? { role: "ALUMNI" as const }
        : undefined;

  // 1. Fetch Top Companies (if section is "all" or "company")
  let topCompanies: any[] = [];
  if (section === "all" || section === "company") {
    topCompanies = await db.company.findMany({
      where: roleCondition
        ? {
            roles: {
              some: {
                ownerType: { in: ["FOUNDER", "CO_FOUNDER"] },
                user: roleCondition,
              },
            },
          }
        : {},
      orderBy: [{ verifiedRevenue: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: {
        roles: {
          where: { ownerType: { in: ["FOUNDER", "CO_FOUNDER"] } },
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
        },
        _count: { select: { followers: true, posts: true } },
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
  }

  // 2. Fetch Top Projects (if section is "all" or "project")
  let topProjects: any[] = [];
  if (section === "all" || section === "project") {
    topProjects = await db.openSourceProject.findMany({
      where: roleCondition
        ? {
            owner: roleCondition,
          }
        : {},
      orderBy: [{ starsCount: "desc" }, { createdAt: "desc" }],
      take: 10,
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
        _count: { select: { followers: true, posts: true } },
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
  }

  // Format Top Initiatives
  const topList: any[] = [
    ...topCompanies.map((c) => ({
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      logoUrl: c.logoUrl,
      stage: c.stage,
      verifiedRevenue: c.verifiedRevenue,
      isRevenueVerified: c.isRevenueVerified,
      followersCount: c._count.followers,
      postsCount: c._count.posts,
      type: "company" as const,
      founder: c.roles[0]?.user ?? null,
      viewerHasFollowed: viewerId ? Boolean(c.followers?.length) : false,
    })),
    ...topProjects.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      logoUrl: p.logoUrl,
      githubUrl: p.githubUrl,
      starsCount: p.starsCount,
      contributorsCount: p.contributorsCount,
      primaryLanguage: p.primaryLanguage,
      followersCount: p._count.followers,
      postsCount: p._count.posts,
      type: "project" as const,
      founder: p.owner,
      viewerHasFollowed: viewerId ? Boolean(p.followers?.length) : false,
    })),
  ];

  // 3. Network Initiatives: Connected & Followed Users' initiatives
  let networkList: any[] = [];
  if (viewerId) {
    const [connections, follows] = await Promise.all([
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: viewerId }, { receiverId: viewerId }],
        },
        select: { senderId: true, receiverId: true },
      }),
      db.userFollow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      }),
    ]);

    const connectedUserIds = new Set<string>(
      connections.map((c) => (c.senderId === viewerId ? c.receiverId : c.senderId)),
    );
    const followedUserIds = new Set<string>(follows.map((f) => f.followingId));
    const allNetworkIds = Array.from(new Set([...connectedUserIds, ...followedUserIds]));

    if (allNetworkIds.length > 0) {
      let networkCompanies: any[] = [];
      if (section === "all" || section === "company") {
        networkCompanies = await db.company.findMany({
          where: {
            roles: {
              some: {
                userId: { in: allNetworkIds },
                ownerType: { in: ["FOUNDER", "CO_FOUNDER"] },
                ...(roleCondition ? { user: roleCondition } : {}),
              },
            },
          },
          take: 10,
          include: {
            roles: {
              where: {
                userId: { in: allNetworkIds },
                ownerType: { in: ["FOUNDER", "CO_FOUNDER"] },
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
            },
            _count: { select: { followers: true, posts: true } },
            followers: {
              where: { userId: viewerId },
              select: { userId: true },
            },
          },
        });
      }

      let networkProjects: any[] = [];
      if (section === "all" || section === "project") {
        networkProjects = await db.openSourceProject.findMany({
          where: {
            ownerUserId: { in: allNetworkIds },
            ...(roleCondition ? { owner: roleCondition } : {}),
          },
          take: 10,
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
            _count: { select: { followers: true, posts: true } },
            followers: {
              where: { userId: viewerId },
              select: { userId: true },
            },
          },
        });
      }

      networkList = [
        ...networkCompanies.map((c) => {
          const founderUser = c.roles[0]?.user;
          const isConnection = founderUser ? connectedUserIds.has(founderUser.id) : false;
          return {
            id: c.id,
            name: c.name,
            tagline: c.tagline,
            logoUrl: c.logoUrl,
            stage: c.stage,
            verifiedRevenue: c.verifiedRevenue,
            isRevenueVerified: c.isRevenueVerified,
            followersCount: c._count.followers,
            postsCount: c._count.posts,
            type: "company" as const,
            founder: founderUser,
            relationship: isConnection ? "Connected" : "Following",
            viewerHasFollowed: Boolean(c.followers?.length),
          };
        }),
        ...networkProjects.map((p) => {
          const isConnection = connectedUserIds.has(p.owner.id);
          return {
            id: p.id,
            name: p.name,
            tagline: p.tagline,
            logoUrl: p.logoUrl,
            githubUrl: p.githubUrl,
            starsCount: p.starsCount,
            contributorsCount: p.contributorsCount,
            primaryLanguage: p.primaryLanguage,
            followersCount: p._count.followers,
            postsCount: p._count.posts,
            type: "project" as const,
            founder: p.owner,
            relationship: isConnection ? "Connected" : "Following",
            viewerHasFollowed: Boolean(p.followers?.length),
          };
        }),
      ];
    }
  }

  return NextResponse.json({
    topInitiatives: topList,
    networkInitiatives: networkList,
  });
}
