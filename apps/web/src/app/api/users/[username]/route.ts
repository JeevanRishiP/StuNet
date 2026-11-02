/**
 * GET /api/users/[username]
 * Returns a user profile. Applies block check and contact visibility rules.
 * Never returns fields from user_private_details without checking visibility.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeForViewer, serializePublicProfile, blockedStub } from "@/lib/serializers";

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } },
): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const user = await db.userIdentity.findUnique({
    where: { username: params.username, isActive: true, isBanned: false },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If no viewer (guest), return public profile only
  if (!viewerId) {
    return NextResponse.json(serializePublicProfile(user));
  }

  // Block check — blocked users are invisible to each other
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { initiatorId: viewerId, targetId: user.id },
        { initiatorId: user.id, targetId: viewerId },
      ],
    },
  });
  if (block) return NextResponse.json(blockedStub(user.id), { status: 200 });

  // Determine relationship for contact visibility
  let viewerRelation: "self" | "connection" | "campus" | "public" = "public";
  if (viewerId === user.id) {
    viewerRelation = "self";
  } else {
    const connection = await db.connection.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: viewerId, receiverId: user.id },
          { senderId: user.id, receiverId: viewerId },
        ],
      },
    });
    if (connection) {
      viewerRelation = "connection";
    } else {
      // Check same campus
      const viewer = await db.userIdentity.findUnique({ where: { id: viewerId } });
      if (viewer?.campusId && viewer.campusId === user.campusId) {
        viewerRelation = "campus";
      }
    }
  }

  // Fetch private details only when needed (self or visibility allows)
  let privateEmail: string | null = null;
  let privatePhone: string | null = null;

  const needsContact =
    viewerRelation === "self" ||
    user.contactVisibility === "PUBLIC" ||
    (user.contactVisibility === "CONNECTIONS" && viewerRelation === "connection") ||
    (user.contactVisibility === "CAMPUS" &&
      (viewerRelation === "connection" || viewerRelation === "campus"));

  if (needsContact) {
    const privateDetails = await db.userPrivateDetails.findUnique({
      where: { userId: user.id },
      select: { email: true, whatsappNumber: true, personalEmail: true },
    });
    privateEmail = privateDetails?.personalEmail ?? null;
    privatePhone = privateDetails?.whatsappNumber ?? null;
  }

  return NextResponse.json(serializeForViewer(user, privateEmail, privatePhone, viewerRelation));
}
