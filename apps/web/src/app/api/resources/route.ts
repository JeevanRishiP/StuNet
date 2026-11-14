/**
 * /api/resources
 * Useful Resources (GitHub Repos, Blogs, Research Papers, News Articles)
 * Plan Delta v3 Section 4.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UsefulResourceSchema } from "@stunet/types";
import { ResourceCategory } from "@prisma/client";
import { resolveViewerContext } from "@/lib/post-access";
import { rankResourceCandidates } from "@/lib/feed-ranking";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);

  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.toUpperCase() as ResourceCategory | undefined;
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const sort = url.searchParams.get("sort") ?? "relevant";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);

  const candidateTake = sort === "recent" ? limit : Math.max(limit * 3, 50);

  const resources = await db.usefulResource.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: candidateTake,
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          campusId: true,
          campus: { select: { name: true, slug: true } },
        },
      },
    },
  });

  const rankedResources = await rankResourceCandidates(resources, viewer, limit, { sort });
  return NextResponse.json({ items: rankedResources });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UsefulResourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid resource data" },
      { status: 422 },
    );
  }

  const { title, category, url, description, tags } = parsed.data;

  const resource = await db.usefulResource.create({
    data: {
      createdByUserId: userId,
      title,
      category: category as ResourceCategory,
      url: url || null,
      description,
    },
    include: {
      creator: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  // Handle tags if provided
  if (tags && tags.length > 0) {
    for (const tagLabel of tags) {
      const cleanLabel = tagLabel.toLowerCase().trim().replace(/^#/, "");
      if (!cleanLabel) continue;

      const tagRecord = await db.tag.upsert({
        where: { label: cleanLabel },
        create: { label: cleanLabel },
        update: {},
      });

      await db.taggable.upsert({
        where: {
          tagId_taggableType_taggableId: {
            tagId: tagRecord.id,
            taggableType: "RESOURCE",
            taggableId: resource.id,
          },
        },
        create: {
          tagId: tagRecord.id,
          taggableType: "RESOURCE",
          taggableId: resource.id,
        },
        update: {},
      });
    }
  }

  return NextResponse.json(resource, { status: 201 });
}
