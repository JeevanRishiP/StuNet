/**
 * Profile page — /u/[username]
 * Server component: fetches profile via DB directly (same process).
 * Respects serializer visibility rules — only shows fields the viewer is allowed to see.
 */
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeForViewer } from "@/lib/serializers";
import { buildPostAccessWhere, canViewerAccessPost, resolveViewerContext } from "@/lib/post-access";
import ProfileClient from "./ProfileClient";

interface Props {
  params: { username: string };
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();
  const viewer = await resolveViewerContext(session);
  const viewerId = viewer.viewerId;

  // Fetch target user + campus + Plan Delta v3 relations (posts fetched separately with strict policy)
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
      clubMemberships: {
        where: { isActive: true, role: { not: "MEMBER" } },
        include: { club: { select: { name: true, slug: true } } },
      },
      clubRoleAssignments: {
        where: { revokedAt: null },
        include: { club: { select: { name: true, slug: true } } },
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
  if (!viewer.isGuest && viewerId === target.id) {
    viewerRelation = "self";
  } else if (connectionStatus === "ACCEPTED") {
    viewerRelation = "connection";
  } else if (!viewer.isGuest && viewer.campusId && viewer.campusId === target.campusId) {
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
      <div className="text-center py-20 text-gray-500 dark:text-slate-400">
        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">
          Profile unavailable
        </p>
        <p className="text-sm mt-1">This content is not available.</p>
      </div>
    );
  }

  // Real database connection count (Accepted connections), follow counts, viewer follow state, posts and polls
  const [connectionCount, followerCount, followingCount, followRecord, rawVisiblePosts, rawPolls] =
    await Promise.all([
      db.connection.count({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: target.id }, { receiverId: target.id }],
        },
      }),
      db.userFollow.count({
        where: { followingId: target.id },
      }),
      db.userFollow.count({
        where: { followerId: target.id },
      }),
      !viewer.isGuest && viewerId && viewerId !== target.id
        ? db.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: target.id,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      db.post.findMany({
        where: buildPostAccessWhere(viewer, { profileOwnerId: target.id }),
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          author: { select: { campusId: true } },
          _count: { select: { comments: true } },
        },
      }),
      db.poll.findMany({
        where: {
          post: {
            authorId: target.id,
            deletedAt: null,
          },
          deletedAt: null,
          ...(viewerId === target.id ? {} : { isAnonymous: false }),
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          options: {
            orderBy: { sortOrder: "asc" },
            include: {
              _count: { select: { entries: true } },
            },
          },
          _count: {
            select: { entries: true },
          },
        },
      }),
    ]);

  const initialIsFollowing = Boolean(followRecord);

  // Second-layer defense-in-depth verification (role isolation, connection scope, visibility, anonymity)
  const visiblePosts = rawVisiblePosts.filter((p) =>
    canViewerAccessPost(viewer, p, { isProfileView: true }),
  );

  // Aggregate active club leadership roles (prioritizing PRESIDENT)
  const presidentClubMap = new Map<string, { clubName: string; clubSlug: string }>();
  let primaryOtherLeadership: { role: string; clubName: string } | undefined = undefined;

  for (const m of target.clubMemberships) {
    if (m.role === "PRESIDENT") {
      presidentClubMap.set(m.club.slug, { clubName: m.club.name, clubSlug: m.club.slug });
    } else if (!primaryOtherLeadership) {
      primaryOtherLeadership = {
        role: m.role.replace(/_/g, " "),
        clubName: m.club.name,
      };
    }
  }
  for (const a of target.clubRoleAssignments) {
    if (a.role === "PRESIDENT") {
      presidentClubMap.set(a.club.slug, { clubName: a.club.name, clubSlug: a.club.slug });
    } else if (!primaryOtherLeadership && a.role !== "MEMBER") {
      primaryOtherLeadership = {
        role: a.role.replace(/_/g, " "),
        clubName: a.club.name,
      };
    }
  }
  const presidentClubs = Array.from(presidentClubMap.values());

  // Build profile data for client — use schema fields + Delta v3 relations
  const profileData = {
    id: serialized.id,
    username: serialized.username,
    displayName: serialized.displayName,
    avatarUrl: serialized.avatarUrl,
    headline: serialized.headline,
    bio: serialized.bio,
    role: target.role,
    presidentClubs,
    clubRole: primaryOtherLeadership,
    campusName: target.campus?.name ?? null,
    joiningYear: serialized.joiningYear,
    academicYear: serialized.academicYear,
    connectionCount,
    followerCount,
    followingCount,
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
    // Strictly filtered posts visible to the current viewer
    posts: visiblePosts.map((p) => ({
      id: p.id,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
      commentCount: p._count.comments,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
    })),
    // Authored polls visible to viewer
    polls: (rawPolls || []).map((poll) => {
      const totalVotes = poll.options.reduce((sum, opt) => sum + opt._count.entries, 0);
      return {
        id: poll.id,
        postId: poll.postId,
        question: poll.question,
        pollType: poll.pollType,
        complaintLevel: poll.complaintLevel,
        section: poll.section,
        scopeLabel: poll.scopeLabel,
        isAnonymous: poll.isAnonymous,
        submissionMode: poll.submissionMode,
        closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
        totalVotes,
        createdAt: poll.createdAt.toISOString(),
        options: poll.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt._count.entries,
          pct: totalVotes > 0 ? Math.round((opt._count.entries / totalVotes) * 100) : 0,
        })),
      };
    }),
  };

  return (
    <ProfileClient
      profile={profileData}
      isOwn={!viewer.isGuest && viewerId === target.id}
      isGuest={viewer.isGuest}
      connectionStatus={connectionStatus}
      connectionId={connectionId}
      initialIsFollowing={initialIsFollowing}
      viewerId={viewerId}
    />
  );
}
