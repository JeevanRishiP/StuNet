import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";

export async function POST(
  _req: NextRequest,
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
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const existingFollow = await db.projectFollow.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  let following = false;
  if (existingFollow) {
    await db.projectFollow.delete({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });
    following = false;
  } else {
    await db.projectFollow.create({
      data: {
        userId,
        projectId,
      },
    });
    following = true;
  }

  const followersCount = await db.projectFollow.count({
    where: { projectId },
  });

  return NextResponse.json({
    success: true,
    following,
    followersCount,
  });
}
