/**
 * /api/projects
 * GET  — list open source projects
 * POST — register open source project with links
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { OpenSourceProjectSchema } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  const projects = await db.openSourceProject.findMany({
    where: userId ? { ownerUserId: userId } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      owner: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
      links: true,
    },
  });

  return NextResponse.json({ items: projects });
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

  const parsed = OpenSourceProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid project data" },
      { status: 422 },
    );
  }

  const { name, description, githubUrl, links } = parsed.data;

  const project = await db.openSourceProject.create({
    data: {
      ownerUserId: userId,
      name,
      description,
      githubUrl,
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
    include: {
      links: true,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
