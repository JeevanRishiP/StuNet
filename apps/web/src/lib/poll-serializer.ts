/**
 * apps/web/src/lib/poll-serializer.ts
 *
 * Canonical serializer for Polls across GET /api/polls and POST /api/polls/[id]/vote.
 * Enforces:
 *   1. Pseudonymous anonymity redaction (author identity omitted when isAnonymous = true)
 *   2. Strict Percentage Visibility Rule: per-option percentages and vote counts are
 *      ONLY returned once the viewer has chosen/submitted a vote (`hasVoted === true`).
 *   3. Accurate denominators for Single-Answer vs. Multiple-Answer polls.
 */
import { db } from "@/lib/db";
import type { ViewerContext } from "@/lib/post-access";

export interface SerializedPollOption {
  id: string;
  text: string;
  sortOrder: number;
  votes: number | null;
  percent: number | null;
}

export interface SerializedPoll {
  id: string;
  postId: string;
  question: string;
  isAnonymous: boolean;
  allowMultipleAnswers: boolean;
  submissionMode: "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT";
  geoScope: string;
  scope: string;
  campusId: string | null;
  targetScope: "ALL" | "CONNECTED";
  targetRoles: string[];
  authorId: string | null;
  authorName: string;
  authorUsername: string | null;
  authorRole: string;
  authorAvatarUrl: string | null;
  authorCampus?: { id: string; name: string } | null;
  isConnection?: boolean;
  isFollowing?: boolean;
  options: SerializedPollOption[];
  userSelectedOptionIds: string[];
  hasSubmitted: boolean;
  hasVoted: boolean;
  isLocked: boolean;
  totalVotes: number;
  totalResponses: number;
  closesAt: string | null;
  pollType?: string;
  complaintLevel?: string | null;
  section?: string | null;
  batch?: string | null;
  calculationBasis?: "SECTION" | "BATCH" | "CAMPUS" | "RESPONSES";
  totalTargetStudents?: number | null;
  autoDeleteOnExpire?: boolean;
  commentCount?: number;
  createdAt: string;
}

export interface PollWithRelations {
  id: string;
  postId: string;
  question: string;
  isAnonymous: boolean;
  allowMultipleAnswers: boolean;
  submissionMode: "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT";
  geoScope: string;
  scopeLabel: string;
  campusId: string | null;
  campus?: { id: string; name: string; city: string; state: string } | null;
  targetConnectionScope: string;
  targetRoles: string[];
  closesAt: Date | null;
  pollType?: string;
  complaintLevel?: string | null;
  section?: string | null;
  batch?: string | null;
  autoDeleteOnExpire?: boolean;
  createdAt: Date;
  post: {
    id: string;
    authorId: string;
    visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
    targetConnectionScope: string;
    targetRoles: string[];
    isAnonymous: boolean;
    isHidden: boolean;
    deletedAt: Date | null;
    commentCount?: number;
    _count?: { threadComments?: number };
    author: {
      id: string;
      displayName: string;
      username: string;
      avatarUrl: string | null;
      role: string;
      campusId: string | null;
      campus: { id: string; name: string; city: string; state: string } | null;
    };
  };
  options: Array<{
    id: string;
    text: string;
    sortOrder: number;
    _count: { entries: number };
  }>;
}

export async function serializePollsForViewer(
  polls: PollWithRelations[],
  viewerOrContext: ViewerContext | string | null,
): Promise<SerializedPoll[]> {
  if (polls.length === 0) return [];
  const pollIds = polls.map((p) => p.id);

  const viewerId =
    typeof viewerOrContext === "object" && viewerOrContext !== null
      ? viewerOrContext.viewerId
      : viewerOrContext;

  const connectedUserIds = new Set<string>();
  const followedUserIds = new Set<string>();

  if (typeof viewerOrContext === "object" && viewerOrContext !== null) {
    for (const id of viewerOrContext.connectedUserIds) connectedUserIds.add(id);
    for (const id of viewerOrContext.followedUserIds) followedUserIds.add(id);
  } else if (viewerId) {
    const [conns, folls] = await Promise.all([
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: viewerId }, { receiverId: viewerId }],
        },
        select: { senderId: true, receiverId: true },
      }),
      db.userFollow.findMany({
        where: { followerId: viewerId },
        select: { followingId: true },
      }),
    ]);
    for (const c of conns) {
      connectedUserIds.add(c.senderId === viewerId ? c.receiverId : c.senderId);
    }
    for (const f of folls) {
      followedUserIds.add(f.followingId);
    }
  }

  // Batch fetch distinct voter counts, viewer's selected options, and viewer's submission locks
  const [distinctVoterGroups, viewerEntries, viewerSubmissions] = await Promise.all([
    db.pollEntry.groupBy({
      by: ["pollId", "creatorId"],
      where: { pollId: { in: pollIds } },
    }),
    viewerId
      ? db.pollEntry.findMany({
          where: { pollId: { in: pollIds }, creatorId: viewerId },
          select: { pollId: true, optionId: true },
        })
      : Promise.resolve([]),
    viewerId
      ? db.pollSubmission.findMany({
          where: { pollId: { in: pollIds }, userId: viewerId },
          select: { pollId: true, submittedAt: true },
        })
      : Promise.resolve([]),
  ]);

  const voterCountByPoll = new Map<string, number>();
  for (const row of distinctVoterGroups) {
    voterCountByPoll.set(row.pollId, (voterCountByPoll.get(row.pollId) ?? 0) + 1);
  }

  const viewerSelectedByPoll = new Map<string, string[]>();
  for (const entry of viewerEntries) {
    const existing = viewerSelectedByPoll.get(entry.pollId) ?? [];
    existing.push(entry.optionId);
    viewerSelectedByPoll.set(entry.pollId, existing);
  }

  const submittedPollIds = new Set(viewerSubmissions.map((s) => s.pollId));

  // Gather campus IDs for student count lookups (for complaint polls)
  const campusIds = Array.from(
    new Set(polls.map((p) => p.campusId || p.post.author.campusId).filter(Boolean) as string[]),
  );

  const [campusStudentGroups, sectionStudentGroups, batchStudentGroups, campusBatches] =
    await Promise.all([
      campusIds.length > 0
        ? db.userIdentity.groupBy({
            by: ["campusId"],
            where: { campusId: { in: campusIds }, role: { in: ["STUDENT", "CLUB_MANAGER"] } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      campusIds.length > 0
        ? db.userIdentity.groupBy({
            by: ["campusId", "section"],
            where: {
              campusId: { in: campusIds },
              section: { not: null },
              role: { in: ["STUDENT", "CLUB_MANAGER"] },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      campusIds.length > 0
        ? db.userIdentity.groupBy({
            by: ["campusId", "joiningYear"],
            where: {
              campusId: { in: campusIds },
              joiningYear: { not: null },
              role: { in: ["STUDENT", "CLUB_MANAGER"] },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
      campusIds.length > 0
        ? db.campusBatch.findMany({
            where: { campusId: { in: campusIds } },
            select: { campusId: true, year: true, numberOfStudents: true, numberOfSections: true },
          })
        : Promise.resolve([]),
    ]);

  const campusStudentCountMap = new Map<string, number>();
  for (const c of campusStudentGroups) {
    if (c.campusId) campusStudentCountMap.set(c.campusId, c._count.id);
  }

  const sectionStudentCountMap = new Map<string, number>();
  for (const s of sectionStudentGroups) {
    if (s.campusId && s.section) {
      sectionStudentCountMap.set(`${s.campusId}:${s.section.toLowerCase().trim()}`, s._count.id);
    }
  }

  const batchStudentCountMap = new Map<string, number>();
  for (const b of batchStudentGroups) {
    if (b.campusId && b.joiningYear) {
      batchStudentCountMap.set(`${b.campusId}:${b.joiningYear}`, b._count.id);
    }
  }

  for (const cb of campusBatches) {
    if (cb.numberOfStudents && cb.numberOfStudents > 0) {
      const existing = batchStudentCountMap.get(`${cb.campusId}:${cb.year}`) ?? 0;
      if (cb.numberOfStudents > existing) {
        batchStudentCountMap.set(`${cb.campusId}:${cb.year}`, cb.numberOfStudents);
      }
    }
  }

  return polls.map((poll) => {
    const selectedIds = viewerSelectedByPoll.get(poll.id) ?? [];
    const hasSubmitted = submittedPollIds.has(poll.id);
    const hasVoted =
      poll.submissionMode === "SINGLE_SUBMIT"
        ? hasSubmitted || selectedIds.length > 0
        : selectedIds.length > 0;
    const isLocked = poll.submissionMode === "SINGLE_SUBMIT" && hasVoted;

    const totalSelections = poll.options.reduce((sum, opt) => sum + opt._count.entries, 0);
    const uniqueVoters = voterCountByPoll.get(poll.id) ?? 0;

    // Complaint Poll Custom Denominator Calculation:
    // Section Level: total students in section
    // Batch Level: total students in batch
    // Campus Level: total students in campus
    // General Complaints: total users who answered the poll
    const isComplaint = poll.pollType === "COMPLAINT";
    const compLvl = poll.complaintLevel?.toUpperCase();
    const effectiveCampusId = poll.campusId || poll.post.author.campusId;

    let denominator = poll.allowMultipleAnswers ? uniqueVoters : totalSelections;
    let calculationBasis: "SECTION" | "BATCH" | "CAMPUS" | "RESPONSES" = "RESPONSES";
    let totalTargetStudents: number | null = null;

    if (isComplaint) {
      if (compLvl === "SECTION" && poll.section && effectiveCampusId) {
        const key = `${effectiveCampusId}:${poll.section.toLowerCase().trim()}`;
        const secCount = sectionStudentCountMap.get(key) ?? 0;
        if (secCount > 0) {
          denominator = secCount;
          totalTargetStudents = secCount;
          calculationBasis = "SECTION";
        }
      } else if (compLvl === "BATCH" && effectiveCampusId) {
        const parsedYear = poll.batch ? parseInt(poll.batch.replace(/\D/g, ""), 10) : null;
        const key = parsedYear ? `${effectiveCampusId}:${parsedYear}` : null;
        const bCount = key ? (batchStudentCountMap.get(key) ?? 0) : 0;
        if (bCount > 0) {
          denominator = bCount;
          totalTargetStudents = bCount;
          calculationBasis = "BATCH";
        }
      } else if (compLvl === "CAMPUS" && effectiveCampusId) {
        const cCount = campusStudentCountMap.get(effectiveCampusId) ?? 0;
        if (cCount > 0) {
          denominator = cCount;
          totalTargetStudents = cCount;
          calculationBasis = "CAMPUS";
        }
      }
    }

    const sortedOptions = [...poll.options].sort((a, b) => a.sortOrder - b.sortOrder);
    const serializedOptions: SerializedPollOption[] = sortedOptions.map((opt) => {
      if (!hasVoted) {
        return {
          id: opt.id,
          text: opt.text,
          sortOrder: opt.sortOrder,
          votes: null,
          percent: null,
        };
      }
      const rawVotes = opt._count.entries;
      const pct = denominator > 0 ? Math.min(100, Math.round((rawVotes / denominator) * 100)) : 0;
      return {
        id: opt.id,
        text: opt.text,
        sortOrder: opt.sortOrder,
        votes: rawVotes,
        percent: pct,
      };
    });

    const roleDisplay =
      poll.post.author.role === "FACULTY"
        ? "Anonymous Faculty"
        : poll.post.author.role === "ALUMNI"
          ? "Anonymous Alumni"
          : "Anonymous Student";

    return {
      id: poll.id,
      postId: poll.postId,
      question: poll.question,
      isAnonymous: poll.isAnonymous,
      allowMultipleAnswers: poll.allowMultipleAnswers,
      submissionMode: poll.submissionMode,
      geoScope: poll.geoScope,
      scope: poll.scopeLabel,
      campusId: poll.campusId,
      targetScope: poll.targetConnectionScope === "CONNECTED" ? "CONNECTED" : "ALL",
      targetRoles: poll.targetRoles,
      authorId: poll.isAnonymous ? null : poll.post.author.id,
      authorName: poll.isAnonymous ? roleDisplay : poll.post.author.displayName,
      authorUsername: poll.isAnonymous ? null : poll.post.author.username,
      authorRole: poll.post.author.role,
      authorAvatarUrl: poll.isAnonymous ? null : poll.post.author.avatarUrl,
      authorCampus: poll.post.author.campus
        ? { id: poll.post.author.campus.id, name: poll.post.author.campus.name }
        : poll.campus
          ? { id: poll.campus.id, name: poll.campus.name }
          : null,
      isConnection: viewerId ? connectedUserIds.has(poll.post.author.id) : false,
      isFollowing: viewerId ? followedUserIds.has(poll.post.author.id) : false,
      options: serializedOptions,
      userSelectedOptionIds: selectedIds,
      hasSubmitted,
      hasVoted,
      isLocked,
      totalVotes: uniqueVoters > 0 ? uniqueVoters : totalSelections,
      totalResponses: totalSelections,
      closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
      pollType: poll.pollType || "GENERAL",
      complaintLevel: poll.complaintLevel || null,
      section: poll.section || null,
      batch: poll.batch || null,
      calculationBasis,
      totalTargetStudents,
      autoDeleteOnExpire: Boolean(poll.autoDeleteOnExpire),
      commentCount: poll.post._count?.threadComments ?? poll.post.commentCount ?? 0,
      createdAt: poll.createdAt.toISOString(),
    };
  });
}
