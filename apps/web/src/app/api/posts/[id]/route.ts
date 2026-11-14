/**
 * /api/posts/[id]
 *
 * GET, PATCH, DELETE for a single post.
 * Author or Admin only for mutations.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdatePostSchema = z.object({
  body: z.string().min(1, "Post body cannot be empty").max(10000).trim(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const post = await db.post.findUnique({
    where: { id: params.id },
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
      poll: {
        include: {
          options: true,
        },
      },
    },
  });

  if (!post || post.deletedAt) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ post });
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
  const postId = params.id;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      companyId: true,
      openSourceProjectId: true,
      deletedAt: true,
    },
  });

  if (!post || post.deletedAt) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = post.authorId === userId;
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "CAMPUS_MANAGER";

  if (post.companyId) {
    // Company post rule: Posts can only be edited by the founder (even if posted by co-founder)
    const founderRole = await db.userCompanyRole.findFirst({
      where: {
        companyId: post.companyId,
        userId,
        ownerType: "FOUNDER",
      },
    });

    if (!founderRole && !isAdmin) {
      return NextResponse.json(
        { error: "Company posts can only be edited by the primary company founder." },
        { status: 403 },
      );
    }
  } else if (post.openSourceProjectId) {
    const project = await db.openSourceProject.findUnique({
      where: { id: post.openSourceProjectId },
      select: { ownerUserId: true },
    });

    if (project?.ownerUserId !== userId && !isAdmin) {
      return NextResponse.json(
        { error: "Open source project posts can only be edited by the project lead maintainer." },
        { status: 403 },
      );
    }
  } else {
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized to edit this post" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = UpdatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid content" },
      { status: 422 },
    );
  }

  const updated = await db.post.update({
    where: { id: postId },
    data: { body: parsed.data.body },
  });

  return NextResponse.json({ success: true, post: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const postId = params.id;

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, deletedAt: true },
  });

  if (!post || post.deletedAt) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = post.authorId === userId;
  const isAdmin = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "CAMPUS_MANAGER";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized to delete this post" }, { status: 403 });
  }

  await db.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true, message: "Post deleted successfully" });
}
