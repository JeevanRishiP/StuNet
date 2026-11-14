/**
 * Follows API (LinkedIn-style asymmetric 1-way follow graph)
 * POST   /api/follows            — follow a user (no two-way approval required)
 * DELETE /api/follows            — unfollow a user
 * GET    /api/follows            — list my following / followers + counts
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { z } from "zod";

const FollowSchema = z.object({
  followingId: z.string().min(1),
  source: z.enum(["PROFILE", "FEED", "SEARCH", "NETWORK"]).optional().default("PROFILE"),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const userId = actorCheck.user.id;
  const viewer = await resolveViewerContext(session);
  const blockedIds = viewer.blockedIds;

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") ?? userId;

  const [followingRows, followerRows] = await Promise.all([
    db.userFollow.findMany({
      where: {
        followerId: targetUserId,
        ...(blockedIds.length > 0 ? { followingId: { notIn: blockedIds } } : {}),
      },
      include: {
        following: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            headline: true,
            role: true,
            campus: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    db.userFollow.findMany({
      where: {
        followingId: targetUserId,
        ...(blockedIds.length > 0 ? { followerId: { notIn: blockedIds } } : {}),
      },
      include: {
        follower: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            headline: true,
            role: true,
            campus: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  return NextResponse.json({
    following: followingRows.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      source: f.source,
      person: f.following,
    })),
    followers: followerRows.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      source: f.source,
      person: f.follower,
    })),
    followingIds: followingRows.map((f) => f.followingId),
    followingCount: followingRows.length,
    followerCount: followerRows.length,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const followerId = actorCheck.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = FollowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { followingId, source } = parsed.data;
  if (followingId === followerId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const [target, block, existing] = await Promise.all([
    db.userIdentity.findUnique({
      where: { id: followingId },
      select: { id: true, role: true, isActive: true, isBanned: true },
    }),
    db.userBlock.findFirst({
      where: {
        OR: [
          { initiatorId: followerId, targetId: followingId },
          { initiatorId: followingId, targetId: followerId },
        ],
      },
      select: { id: true },
    }),
    db.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { id: true },
    }),
  ]);

  if (!target || !target.isActive || target.isBanned || target.role === "GUEST" || block) {
    return NextResponse.json({ error: "User cannot be followed" }, { status: 404 });
  }

  if (!existing) {
    await db.userFollow.create({
      data: {
        followerId,
        followingId,
        source,
      },
    });

    const followerUser = await db.userIdentity.findUnique({
      where: { id: followerId },
      select: { displayName: true, username: true },
    });

    await db.notification.create({
      data: {
        recipientId: followingId,
        triggeredById: followerId,
        type: "NEW_FOLLOWER",
        title: "New Follower",
        body: `${followerUser?.displayName || "A community member"} started following you.`,
        actionUrl: followerUser?.username ? `/u/${followerUser.username}` : "/network",
        isRead: false,
      },
    });
  }

  const followerCount = await db.userFollow.count({ where: { followingId } });

  return NextResponse.json({ isFollowing: true, followerCount }, { status: existing ? 200 : 201 });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const followerId = actorCheck.user.id;

  const url = new URL(req.url);
  let followingId = url.searchParams.get("userId");

  if (!followingId) {
    try {
      const body = (await req.json()) as { followingId?: string; userId?: string };
      followingId = body.followingId ?? body.userId ?? null;
    } catch {
      // ignore empty body
    }
  }

  if (!followingId) {
    return NextResponse.json({ error: "followingId is required" }, { status: 422 });
  }

  await db.userFollow.deleteMany({
    where: { followerId, followingId },
  });

  const followerCount = await db.userFollow.count({ where: { followingId } });

  return NextResponse.json({ isFollowing: false, followerCount });
}
