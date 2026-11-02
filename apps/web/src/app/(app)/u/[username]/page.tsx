/**
 * Profile page — /u/[username]
 * Server component: fetches profile via DB directly (same process).
 * Respects serializer visibility rules — only shows fields the viewer is allowed to see.
 */
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeForViewer } from "@/lib/serializers";
import ProfileClient from "./ProfileClient";

interface Props {
  params: { username: string };
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  // Fetch target user + campus
  const target = await db.userIdentity.findUnique({
    where: { username: params.username },
    include: {
      campus: { select: { name: true } },
    },
  });

  if (!target) notFound();

  // Fetch private details separately (separate table, separate security boundary)
  // app_service_role CAN read this; admin_service_role cannot
  const privateDetails = await db.userPrivateDetails.findUnique({
    where: { userId: target.id },
    select: { personalEmail: true, whatsappNumber: true },
  });

  // Check block in either direction
  let isBlocked = false;
  if (viewerId && viewerId !== target.id) {
    const block = await db.userBlock.findFirst({
      where: {
        OR: [
          { initiatorId: viewerId, targetId: target.id },
          { initiatorId: target.id, targetId: viewerId },
        ],
      },
    });
    isBlocked = block !== null;
  }

  // Connection status
  let connectionStatus: "NONE" | "PENDING" | "ACCEPTED" | "SENT" = "NONE";
  let connectionId: string | null = null;
  if (viewerId && viewerId !== target.id && !isBlocked) {
    const conn = await db.connection.findFirst({
      where: {
        OR: [
          { senderId: viewerId, receiverId: target.id },
          { senderId: target.id, receiverId: viewerId },
        ],
      },
    });
    if (conn) {
      connectionId = conn.id;
      if (conn.status === "ACCEPTED") {
        connectionStatus = "ACCEPTED";
      } else if (conn.status === "PENDING") {
        connectionStatus = conn.senderId === viewerId ? "SENT" : "PENDING";
      }
    }
  }

  // Viewer relation for serializer
  let viewerRelation: "self" | "connection" | "campus" | "public" = "public";
  if (viewerId === target.id) {
    viewerRelation = "self";
  } else if (connectionStatus === "ACCEPTED") {
    viewerRelation = "connection";
  } else if (session?.user?.campusId && session.user.campusId === target.campusId) {
    viewerRelation = "campus";
  }

  const serialized = serializeForViewer(
    target,
    privateDetails?.personalEmail ?? null,
    privateDetails?.whatsappNumber ?? null,
    viewerRelation,
  );

  if (isBlocked) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium">Profile unavailable</p>
        <p className="text-sm mt-1">This content is not available.</p>
      </div>
    );
  }

  // Build profile data for client — use only schema fields
  const profileData = {
    id: serialized.id,
    username: serialized.username,
    displayName: serialized.displayName,
    avatarUrl: serialized.avatarUrl,
    headline: serialized.headline,
    bio: serialized.bio,
    campusName: target.campus?.name ?? null,
    // Contact — only present when serializer allows
    email: serialized.personalEmail ?? null,
    phone: serialized.whatsappNumber ?? null,
  };

  return (
    <ProfileClient
      profile={profileData}
      isOwn={viewerId === target.id}
      connectionStatus={connectionStatus}
      connectionId={connectionId}
      viewerId={viewerId}
    />
  );
}
