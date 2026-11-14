import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  tagline: z.string().max(300).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  githubUrl: z.string().url().max(2000).optional(),
  logoUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  starsCount: z.number().int().min(0).optional(),
  contributorsCount: z.number().int().min(1).optional(),
  forksCount: z.number().int().min(0).optional(),
  primaryLanguage: z.string().max(50).optional().nullable(),
  license: z.string().max(50).optional().nullable(),
  isOpenForContributors: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;
  const projectId = params.id;

  const project = await db.openSourceProject.findUnique({
    where: { id: projectId },
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
      opportunities: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      posts: {
        where: { deletedAt: null, isHidden: false },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
          _count: { select: { comments: true } },
          ...(viewerId
            ? {
                postLikes: {
                  where: { userId: viewerId },
                  select: { userId: true },
                },
              }
            : {}),
        },
      },
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

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const viewerFollow = viewerId && project.followers && project.followers.length > 0;
  const isOwner = viewerId ? project.ownerUserId === viewerId : false;
  const memberObj = viewerId ? project.members.find((m) => m.userId === viewerId) : null;
  const isMaintainer = isOwner || memberObj?.role === "MAINTAINER";

  const impactScore =
    project.starsCount * 3 + project.contributorsCount * 10 + project.forksCount * 5;

  return NextResponse.json({
    project: {
      ...project,
      impactScore,
      followersCount: project._count.followers,
      postsCount: project._count.posts,
      opportunitiesCount: project._count.opportunities,
      viewerHasFollowed: Boolean(viewerFollow),
      viewerIsMaintainer: isMaintainer,
      canPost: isMaintainer,
      canManageTeam: isMaintainer,
    },
  });
}

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
  const projectId = params.id;

  const project = await db.openSourceProject.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const isOwner = project.ownerUserId === userId;
  const isMaintainer = isOwner || project.members.some((m) => m.role === "MAINTAINER");
  const isAdmin = session?.user?.role === "SUPER_ADMIN";

  if (!isMaintainer && !isAdmin) {
    return NextResponse.json(
      { error: "Only project maintainers can update project details." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const updated = await db.openSourceProject.update({
    where: { id: projectId },
    data: parsed.data,
  });

  return NextResponse.json({ success: true, project: updated });
}
