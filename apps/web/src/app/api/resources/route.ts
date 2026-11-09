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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const category = url.searchParams.get("category")?.toUpperCase() as ResourceCategory | undefined;
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25", 10), 100);

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
    take: limit,
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          campus: { select: { name: true, slug: true } },
        },
      },
    },
  });

  return NextResponse.json({ items: resources });
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

  const { title, category, url, description } = parsed.data;

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

  return NextResponse.json(resource, { status: 201 });
}
