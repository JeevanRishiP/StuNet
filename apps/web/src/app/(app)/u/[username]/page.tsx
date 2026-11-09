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

  // Fetch target user + campus + Plan Delta v3 relations
  const target = await db.userIdentity.findUnique({
    where: { username: params.username },
    include: {
      campus: { select: { name: true } },
      profileLinks: true,
      companyRoles: {
        where: { showOnProfile: true },
        include: { company: true },
      },
      openSourceProjects: {
        include: { links: true },
        orderBy: { createdAt: "desc" },
      },
      studentAcademicDetails: true,
      facultyDetails: true,
      ownedGroups: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          shortCode: true,
          description: true,
          externalLinkUrl: true,
          type: true,
          memberCount: true,
          hideMembers: true,
        },
      },
      achievements: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      posts: {
        where: { isHidden: false, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          _count: { select: { comments: true } },
        },
      },
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

  // Real database connection count (Accepted connections)
  const connectionCount = await db.connection.count({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: target.id }, { receiverId: target.id }],
    },
  });

  // Build profile data for client — use schema fields + Delta v3 relations
  const profileData = {
    id: serialized.id,
    username: serialized.username,
    displayName: serialized.displayName,
    avatarUrl: serialized.avatarUrl,
    headline: serialized.headline,
    bio: serialized.bio,
    role: target.role,
    campusName: target.campus?.name ?? null,
    joiningYear: serialized.joiningYear,
    academicYear: serialized.academicYear,
    connectionCount,
    // Contact — only present when serializer allows
    email: serialized.personalEmail ?? null,
    phone: serialized.whatsappNumber ?? null,
    // Plan Delta v3: Faculty & Academic
    facultyDetails: target.facultyDetails
      ? {
          employeeId: target.facultyDetails.employeeId,
        }
      : null,
    studentAcademicDetails: target.studentAcademicDetails
      ? {
          usn: target.studentAcademicDetails.usn,
          currentCourseYear: target.studentAcademicDetails.currentCourseYear,
          joinedYear: target.studentAcademicDetails.joinedYear,
          graduationYear: target.studentAcademicDetails.graduationYear,
        }
      : null,
    // Plan Delta v3: Public Profile Links (Linktree-style)
    profileLinks: target.profileLinks.map((l) => ({
      platform: l.platform,
      url: l.url,
    })),
    // Plan Delta v3: Companies & Initiatives (Founders & Co-Founders)
    companyRoles: target.companyRoles.map((cr) => ({
      companyId: cr.companyId,
      companyName: cr.company.name,
      description: cr.company.description,
      websiteUrl: cr.company.websiteUrl,
      linkedinUrl: cr.company.linkedinUrl,
      ownerType: cr.ownerType,
      position: cr.position,
    })),
    // Plan Delta v3: Open-Source Projects
    openSourceProjects: target.openSourceProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      githubUrl: p.githubUrl,
      syncedStars: p.syncedStars,
      links: p.links.map((link) => ({ id: link.id, name: link.name, url: link.url })),
    })),
    // Owned Groups & Communities (Visible in About Section)
    ownedGroups: target.ownedGroups.map((g) => ({
      id: g.id,
      name: g.name,
      code: g.shortCode || "4000",
      description: g.description,
      whatsappLink: g.externalLinkUrl,
      type: g.type,
      memberCount: g.memberCount,
      hideMembers: g.hideMembers,
    })),
    // Real verified achievements from DB
    achievements: target.achievements.map((a) => ({
      id: a.id,
      category: a.category,
      title: a.title,
      description: a.description,
      verificationStatus: a.verificationStatus,
      proofUrl: a.proofUrl,
      createdAt: a.createdAt.toISOString(),
    })),
    // Real posts from DB
    posts: target.posts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      commentCount: p._count.comments,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
    })),
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
