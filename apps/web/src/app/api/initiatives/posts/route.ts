import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ALL_TARGET_ROLES,
  buildPostAccessWhere,
  canViewerAccessPost,
  resolveViewerContext,
} from "@/lib/post-access";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const section = url.searchParams.get("section")?.toLowerCase() ?? "all"; // all | company | project
  const tab = url.searchParams.get("tab")?.toUpperCase(); // ALL | STUDENT | FACULTY | ALUMNI
  const subFilter = url.searchParams.get("subFilter")?.toUpperCase(); // ALL | CONNECTED
  const tag = url.searchParams.get("tag")?.toLowerCase().trim();
  const search = url.searchParams.get("search")?.toLowerCase().trim();

  // Tag filter if specified
  let taggedPostIds: string[] | undefined = undefined;
  if (tag) {
    const tagMatches = await db.taggable.findMany({
      where: {
        taggableType: "POST",
        tag: { label: tag },
      },
      select: { taggableId: true },
    });
    taggedPostIds = tagMatches.map((t) => t.taggableId);
    if (taggedPostIds.length === 0) {
      return NextResponse.json({ posts: [], nextCursor: null, hasMore: false });
    }
  }

  const initiativeType =
    section === "company" ? "COMPANY" : section === "project" ? "PROJECT" : "ALL";

  // Build secure where clause
  const whereClause = buildPostAccessWhere(viewer, {
    tab: tab === "STUDENT" ? "STUDENTS" : tab,
    subFilter,
    taggedPostIds,
    cursor,
    initiativesOnly: true,
    initiativeType,
  });

  // Additional search filter
  if (search && whereClause.AND && Array.isArray(whereClause.AND)) {
    whereClause.AND.push({
      OR: [
        { body: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
        { openSourceProject: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  const posts = await db.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: {
      author: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          verificationStatus: true,
          campusId: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          stage: true,
          tagline: true,
          isRevenueVerified: true,
          verifiedRevenue: true,
        },
      },
      openSourceProject: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          primaryLanguage: true,
          tagline: true,
          starsCount: true,
          githubUrl: true,
        },
      },
      _count: { select: { comments: true } },
      ...(viewer.viewerId
        ? {
            postLikes: {
              where: { userId: viewer.viewerId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  const verifiedPosts = posts.filter((post) => canViewerAccessPost(viewer, post));
  const hasMore = verifiedPosts.length > limit;
  const items = hasMore ? verifiedPosts.slice(0, limit) : verifiedPosts;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

  return NextResponse.json({
    posts: items.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt,
      type: p.type,
      author: p.author,
      company: p.company,
      openSourceProject: p.openSourceProject,
      companyId: p.companyId,
      openSourceProjectId: p.openSourceProjectId,
      likeCount: p.likeCount,
      commentCount: p._count.comments,
      viewerHasLiked: Boolean(viewer.viewerId && p.postLikes && p.postLikes.length > 0),
    })),
    nextCursor,
    hasMore,
  });
}
