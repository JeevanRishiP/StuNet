/**
 * apps/web/src/lib/post-access.ts
 *
 * Canonical, system-level authorization and visibility engine for Posts & Interactions.
 *
 * SECURITY GUARANTEES:
 *  1. Guests (unauthenticated visitors, GUEST role accounts, or banned/inactive users):
 *     - CANNOT create posts, comments, likes, views, or collaboration invites.
 *     - CAN ONLY view posts where:
 *         - deletedAt === null AND isHidden === false
 *         - visibility === "PUBLIC"
 *         - targetConnectionScope === "ALL"
 *         - targetRoles includes ALL THREE: "STUDENT", "FACULTY", and "ALUMNI"
 *         - (on user profiles, isAnonymous MUST ALSO be false)
 *     - Even if ONE of ["STUDENT", "FACULTY", "ALUMNI"] is omitted, Guests CANNOT view the post.
 *  2. Authenticated non-guest users (STUDENT, FACULTY, ALUMNI, etc.):
 *     - Strict role isolation across feeds, user profiles (/u/[username]), comments, likes, and views.
 *     - A non-author viewer can ONLY access a post if:
 *         - Not blocked in either direction
 *         - Post targetRoles includes the viewer's audience role (for managers/admins without an explicit
 *           faculty affiliation, requires all 3 targetRoles so role-restricted posts stay private)
 *         - Post targetConnectionScope & visibility allow the viewer (PUBLIC, verified CONNECTIONS, or verified same-campus CAMPUS)
 *         - On another user's profile, anonymous posts (isAnonymous = true) are NEVER exposed.
 */
import type { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { db } from "@/lib/db";

export const ALL_TARGET_ROLES = ["STUDENT", "FACULTY", "ALUMNI"] as const;
export type TargetAudienceRole = (typeof ALL_TARGET_ROLES)[number];

export interface ViewerContext {
  viewerId: string | null;
  rawRole: string;
  audienceRole: TargetAudienceRole | null;
  isGuest: boolean;
  isVerified: boolean;
  campusId: string | null;
  blockedIds: string[];
  connectedUserIds: Set<string>;
  followedUserIds: Set<string>;
  followedCompanyIds: Set<string>;
  followedProjectIds: Set<string>;
}

export interface PostAccessCandidate {
  id: string;
  authorId: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
  targetConnectionScope: string;
  targetRoles: string[];
  isAnonymous: boolean;
  isHidden: boolean;
  deletedAt: Date | null;
  author?: {
    campusId?: string | null;
  } | null;
}

export interface VerifiedActor {
  id: string;
  role: string;
  campusId: string | null;
  verificationStatus: string;
  isActive: boolean;
  isBanned: boolean;
  joiningYear?: number | null;
}

const GUEST_CONTEXT: ViewerContext = {
  viewerId: null,
  rawRole: "GUEST",
  audienceRole: null,
  isGuest: true,
  isVerified: false,
  campusId: null,
  blockedIds: [],
  connectedUserIds: new Set<string>(),
  followedUserIds: new Set<string>(),
  followedCompanyIds: new Set<string>(),
  followedProjectIds: new Set<string>(),
};

/**
 * Resolves the authoritative viewer context from the database rather than trusting
 * potentially stale JWT claims alone. Any missing, banned, inactive, or GUEST identity
 * resolves to a strict read-only Guest context.
 */
export async function resolveViewerContext(session: Session | null): Promise<ViewerContext> {
  const sessionUserId = session?.user?.id;
  if (!sessionUserId || session?.user?.isGuest || session?.user?.role === "GUEST") {
    return {
      ...GUEST_CONTEXT,
      connectedUserIds: new Set<string>(),
      followedUserIds: new Set<string>(),
    };
  }

  const dbUser = await db.userIdentity.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      role: true,
      campusId: true,
      verificationStatus: true,
      isActive: true,
      isBanned: true,
      facultyDetails: { select: { userId: true } },
    },
  });

  if (!dbUser || !dbUser.isActive || dbUser.isBanned || dbUser.role === "GUEST") {
    return {
      ...GUEST_CONTEXT,
      connectedUserIds: new Set<string>(),
      followedUserIds: new Set<string>(),
    };
  }

  let audienceRole: TargetAudienceRole | null = null;
  if (dbUser.role === "STUDENT") {
    audienceRole = "STUDENT";
  } else if (dbUser.role === "FACULTY") {
    audienceRole = "FACULTY";
  } else if (dbUser.role === "ALUMNI") {
    audienceRole = "ALUMNI";
  } else if (dbUser.role === "CLUB_MANAGER") {
    audienceRole = dbUser.facultyDetails ? "FACULTY" : "STUDENT";
  } else if (dbUser.role === "CAMPUS_MANAGER" || dbUser.role === "SUPER_ADMIN") {
    audienceRole = dbUser.facultyDetails ? "FACULTY" : null;
  }

  const [blocks, connections, follows, companyFollows, projectFollows] = await Promise.all([
    db.userBlock.findMany({
      where: {
        OR: [{ initiatorId: dbUser.id }, { targetId: dbUser.id }],
      },
      select: { initiatorId: true, targetId: true },
    }),
    db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: dbUser.id }, { receiverId: dbUser.id }],
      },
      select: { senderId: true, receiverId: true },
    }),
    db.userFollow.findMany({
      where: { followerId: dbUser.id },
      select: { followingId: true },
    }),
    db.companyFollow.findMany({
      where: { userId: dbUser.id },
      select: { companyId: true },
    }),
    db.projectFollow.findMany({
      where: { userId: dbUser.id },
      select: { projectId: true },
    }),
  ]);

  const blockedIds = blocks.map((b) => (b.initiatorId === dbUser.id ? b.targetId : b.initiatorId));
  const connectedUserIds = new Set<string>(
    connections.map((c) => (c.senderId === dbUser.id ? c.receiverId : c.senderId)),
  );
  const followedUserIds = new Set<string>(follows.map((f) => f.followingId));
  const followedCompanyIds = new Set<string>(companyFollows.map((cf) => cf.companyId));
  const followedProjectIds = new Set<string>(projectFollows.map((pf) => pf.projectId));

  return {
    viewerId: dbUser.id,
    rawRole: dbUser.role,
    audienceRole,
    isGuest: false,
    isVerified: dbUser.verificationStatus === "VERIFIED",
    campusId: dbUser.campusId ?? null,
    blockedIds,
    connectedUserIds,
    followedUserIds,
    followedCompanyIds,
    followedProjectIds,
  };
}

/**
 * Verifies that the caller is an active, non-banned, non-guest user in the database.
 */
export async function requireNonGuestUser(
  session: Session | null,
): Promise<{ ok: true; user: VerifiedActor } | { ok: false; status: 401 | 403; error: string }> {
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (session.user.isGuest || session.user.role === "GUEST") {
    return {
      ok: false,
      status: 403,
      error: "Guest accounts cannot perform this action. Please sign in with a campus account.",
    };
  }

  const dbUser = await db.userIdentity.findUnique({
    where: { id: sessionUserId },
    select: {
      id: true,
      role: true,
      campusId: true,
      verificationStatus: true,
      isActive: true,
      isBanned: true,
      joiningYear: true,
    },
  });

  if (!dbUser) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  if (dbUser.role === "GUEST") {
    return {
      ok: false,
      status: 403,
      error: "Guest accounts cannot perform this action. Please sign in with a campus account.",
    };
  }

  if (!dbUser.isActive || dbUser.isBanned) {
    return {
      ok: false,
      status: 403,
      error: "Your account is not permitted to perform this action.",
    };
  }

  return { ok: true, user: dbUser };
}

/**
 * Builds a strict PostgreSQL-enforced Prisma `where` clause for querying Posts.
 * Ensures inaccessible posts never leave the database.
 */
export function buildPostAccessWhere(
  viewer: ViewerContext,
  options?: {
    profileOwnerId?: string;
    tab?: string;
    subFilter?: string;
    taggedPostIds?: string[];
    batch?: string;
    cursor?: string | null;
    initiativesOnly?: boolean;
    initiativeType?: "ALL" | "COMPANY" | "PROJECT";
    companyId?: string;
    openSourceProjectId?: string;
  },
): Prisma.PostWhereInput {
  const andConditions: Prisma.PostWhereInput[] = [
    { deletedAt: null },
    { isHidden: false },
    { NOT: { targetRoles: { isEmpty: true } } },
  ];

  if (options?.companyId) {
    andConditions.push({ companyId: options.companyId });
  } else if (options?.openSourceProjectId) {
    andConditions.push({ openSourceProjectId: options.openSourceProjectId });
  } else if (options?.initiativesOnly) {
    if (options.initiativeType === "COMPANY") {
      andConditions.push({ companyId: { not: null } });
    } else if (options.initiativeType === "PROJECT") {
      andConditions.push({ openSourceProjectId: { not: null } });
    } else {
      andConditions.push({
        OR: [{ companyId: { not: null } }, { openSourceProjectId: { not: null } }],
      });
    }
  }

  if (viewer.blockedIds.length > 0) {
    andConditions.push({ authorId: { notIn: viewer.blockedIds } });
  }

  if (options?.profileOwnerId) {
    if (viewer.blockedIds.includes(options.profileOwnerId)) {
      return { id: "__blocked_never_match__" };
    }
    andConditions.push({ authorId: options.profileOwnerId });
    if (viewer.isGuest || viewer.viewerId !== options.profileOwnerId) {
      // Never expose anonymous posts on someone else's or public profile
      andConditions.push({ isAnonymous: false });
    }
  }

  if (options?.taggedPostIds) {
    andConditions.push({ id: { in: options.taggedPostIds } });
  }

  if (options?.batch) {
    const batchYear = parseInt(options.batch, 10);
    andConditions.push({
      OR: [
        { batch: options.batch },
        ...(isNaN(batchYear)
          ? []
          : [
              { author: { joiningYear: batchYear } },
              { author: { studentAcademicDetails: { joinedYear: batchYear } } },
            ]),
      ],
    });
  }

  if (options?.cursor) {
    andConditions.push({ createdAt: { lt: new Date(options.cursor) } });
  }

  // Feed stream tab filter
  const tab = options?.tab?.toUpperCase();
  if (tab === "STUDENTS") {
    andConditions.push({ author: { role: { in: ["STUDENT", "CLUB_MANAGER"] } } });
  } else if (tab === "FACULTY") {
    andConditions.push({ author: { role: "FACULTY" } });
  } else if (tab === "ALUMNI") {
    andConditions.push({ author: { role: "ALUMNI" } });
  } else if (tab === "CONNECTED") {
    if (viewer.isGuest || !viewer.viewerId) {
      return { id: "__guest_no_connected_feed__" };
    }
    const allowedAuthors = [viewer.viewerId, ...Array.from(viewer.connectedUserIds)];
    andConditions.push({ authorId: { in: allowedAuthors } });
  } else if (tab === "FOLLOWING") {
    if (viewer.isGuest || !viewer.viewerId) {
      return { id: "__guest_no_following_feed__" };
    }
    const followedAuthors = Array.from(viewer.followedUserIds);
    if (followedAuthors.length === 0) {
      return { id: "__empty_following_feed__" };
    }
    andConditions.push({ authorId: { in: followedAuthors }, isAnonymous: false });
  }

  // Secondary social graph sub-filter (FOLLOWING | CONNECTED)
  const subFilter = options?.subFilter?.toUpperCase();
  if (subFilter === "CONNECTED") {
    if (viewer.isGuest || !viewer.viewerId) {
      return { id: "__guest_no_connected_feed__" };
    }
    const connectedAuthors = Array.from(viewer.connectedUserIds);
    if (connectedAuthors.length === 0) {
      return { id: "__empty_connected_feed__" };
    }
    andConditions.push({ authorId: { in: connectedAuthors }, isAnonymous: false });
  } else if (subFilter === "FOLLOWING") {
    if (viewer.isGuest || !viewer.viewerId) {
      return { id: "__guest_no_following_feed__" };
    }
    const followedAuthors = Array.from(viewer.followedUserIds);
    if (followedAuthors.length === 0) {
      return { id: "__empty_following_feed__" };
    }
    andConditions.push({ authorId: { in: followedAuthors }, isAnonymous: false });
  }

  // Core access rule: Guest vs Authenticated Non-Guest
  if (viewer.isGuest || !viewer.viewerId) {
    andConditions.push({
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: { hasEvery: [...ALL_TARGET_ROLES] },
    });
    return { AND: andConditions };
  }

  const connectedList = Array.from(viewer.connectedUserIds);
  const roleCondition: Prisma.PostWhereInput = viewer.audienceRole
    ? { targetRoles: { has: viewer.audienceRole } }
    : { targetRoles: { hasEvery: [...ALL_TARGET_ROLES] } };

  const visibilityOr: Prisma.PostWhereInput[] = [{ visibility: "PUBLIC" }];
  if (viewer.isVerified) {
    if (connectedList.length > 0) {
      visibilityOr.push({
        visibility: "CONNECTIONS",
        authorId: { in: connectedList },
      });
    }
    if (viewer.campusId) {
      visibilityOr.push({
        visibility: "CAMPUS",
        author: { campusId: viewer.campusId },
      });
    }
  }

  const connectionScopeCondition: Prisma.PostWhereInput =
    connectedList.length > 0
      ? {
          OR: [
            { targetConnectionScope: "ALL" },
            { targetConnectionScope: "CONNECTED", authorId: { in: connectedList } },
          ],
        }
      : { targetConnectionScope: "ALL" };

  const nonAuthorPolicy: Prisma.PostWhereInput = {
    AND: [roleCondition, connectionScopeCondition, { OR: visibilityOr }],
  };

  if (options?.profileOwnerId && options.profileOwnerId !== viewer.viewerId) {
    // Viewing another user's profile: owner shortcut is impossible, apply strict policy directly
    andConditions.push(nonAuthorPolicy);
  } else {
    andConditions.push({
      OR: [{ authorId: viewer.viewerId }, nonAuthorPolicy],
    });
  }

  return { AND: andConditions };
}

/**
 * In-memory defense-in-depth evaluator mirroring `buildPostAccessWhere`.
 * Used on single-post endpoints (comments, likes, views) and post-query verification.
 */
export function canViewerAccessPost(
  viewer: ViewerContext,
  post: PostAccessCandidate,
  options?: { isProfileView?: boolean },
): boolean {
  if (post.deletedAt !== null || post.isHidden) return false;

  const roles = Array.isArray(post.targetRoles) ? post.targetRoles : [];
  if (roles.length === 0) return false;

  if (viewer.blockedIds.includes(post.authorId)) return false;

  // Profile anonymity check
  if (options?.isProfileView && post.isAnonymous) {
    if (viewer.isGuest || viewer.viewerId !== post.authorId) {
      return false;
    }
  }

  // Author can always view their own non-deleted, non-hidden post (never true for guests)
  if (!viewer.isGuest && viewer.viewerId && viewer.viewerId === post.authorId) {
    return true;
  }

  // Guest check: MUST be PUBLIC, ALL scope, and target ALL THREE roles
  if (viewer.isGuest || !viewer.viewerId) {
    if (post.visibility !== "PUBLIC") return false;
    if (post.targetConnectionScope !== "ALL") return false;
    return ALL_TARGET_ROLES.every((r) => roles.includes(r));
  }

  // Role isolation check
  if (viewer.audienceRole) {
    if (!roles.includes(viewer.audienceRole)) return false;
  } else {
    if (!ALL_TARGET_ROLES.every((r) => roles.includes(r))) return false;
  }

  // Connection scope check
  if (post.targetConnectionScope === "CONNECTED") {
    if (!viewer.connectedUserIds.has(post.authorId)) return false;
  }

  // Visibility check
  if (post.visibility === "PUBLIC") {
    return true;
  }
  if (!viewer.isVerified) {
    return false;
  }
  if (post.visibility === "CONNECTIONS") {
    return viewer.connectedUserIds.has(post.authorId);
  }
  if (post.visibility === "CAMPUS") {
    return Boolean(viewer.campusId && post.author?.campusId === viewer.campusId);
  }

  return false;
}
