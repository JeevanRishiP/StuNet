/**
 * /api/users
 * Search users and retrieve top-interacted connected members.
 */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim() || "";
  const topInteracted = url.searchParams.get("topInteracted") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10), 30);

  // Fetch viewer's connected user IDs if logged in
  const connectedUserIds = new Set<string>();
  if (viewerId) {
    const connections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: viewerId }, { receiverId: viewerId }],
      },
      select: { senderId: true, receiverId: true },
    });
    for (const c of connections) {
      connectedUserIds.add(c.senderId === viewerId ? c.receiverId : c.senderId);
    }
  }

  if (topInteracted && viewerId) {
    // Return top connected members (or recent connections)
    const topUsers = await db.userIdentity.findMany({
      where: {
        id: { in: Array.from(connectedUserIds) },
        isActive: true,
      },
      take: limit,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        headline: true,
        role: true,
        campus: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = topUsers.map((u) => ({
      ...u,
      isConnected: true,
    }));

    return NextResponse.json({ users: mapped });
  }

  // Otherwise search across all users (both connected and non-connected)
  const whereClause: Prisma.UserIdentityWhereInput = {
    isActive: true,
  };

  if (viewerId) {
    whereClause.id = { not: viewerId };
  }

  if (query) {
    whereClause.OR = [
      { displayName: { contains: query, mode: "insensitive" } },
      { username: { contains: query, mode: "insensitive" } },
    ];
  }

  const users = await db.userIdentity.findMany({
    where: whereClause,
    take: limit,
    select: {
      id: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      headline: true,
      role: true,
      campus: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = users.map((u) => ({
    ...u,
    isConnected: connectedUserIds.has(u.id),
  }));

  return NextResponse.json({ users: mapped });
}
