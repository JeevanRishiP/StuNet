/**
 * Polls API
 * GET  /api/polls — fetch accessible polls with strict role/visibility/guest isolation and conditional percentage reveal
 * POST /api/polls — create a new poll (with allowMultipleAnswers, submissionMode, targeting, tags, anonymity)
 */
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import {
  ALL_TARGET_ROLES,
  buildPostAccessWhere,
  canViewerAccessPost,
  requireNonGuestUser,
  resolveViewerContext,
} from "@/lib/post-access";
import { serializePollsForViewer } from "@/lib/poll-serializer";
import { rankPollCandidates } from "@/lib/feed-ranking";
import { z } from "zod";

const CreatePollSchema = z.object({
  question: z.string().trim().min(3, "Question must be at least 3 characters").max(500),
  options: z
    .array(z.string().trim().min(1).max(200))
    .min(2, "At least 2 options are required")
    .max(8, "Maximum 8 options allowed"),
  allowMultipleAnswers: z.boolean().default(false),
  submissionMode: z.enum(["SINGLE_SUBMIT", "MULTIPLE_SUBMIT"]).default("SINGLE_SUBMIT"),
  geoScope: z.enum(["ALL", "MY_CAMPUS", "CAMPUS", "CITY", "STATE"]).default("ALL"),
  scopeLabel: z.string().trim().max(150).optional(),
  campusId: z.string().trim().optional().nullable(),
  targetConnectionScope: z.enum(["ALL", "CONNECTED"]).default("ALL"),
  targetRoles: z
    .array(z.enum(ALL_TARGET_ROLES))
    .min(1, "Select at least one target role")
    .default([...ALL_TARGET_ROLES])
    .transform((roles) => Array.from(new Set(roles))),
  isAnonymous: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  closesAt: z.string().datetime().optional().nullable(),
  pollType: z.enum(["GENERAL", "COMPLAINT"]).default("GENERAL"),
  complaintLevel: z.enum(["GENERAL", "CAMPUS", "BATCH", "SECTION"]).optional().nullable(),
  section: z.string().trim().max(50).optional().nullable(),
  batch: z.string().trim().max(50).optional().nullable(),
  autoDeleteOnExpire: z.boolean().default(false),
});

const POLL_INCLUDE = {
  campus: {
    select: { id: true, name: true, city: true, state: true },
  },
  post: {
    select: {
      id: true,
      authorId: true,
      visibility: true,
      targetConnectionScope: true,
      targetRoles: true,
      isAnonymous: true,
      isHidden: true,
      deletedAt: true,
      commentCount: true,
      _count: { select: { threadComments: true } },
      author: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          role: true,
          campusId: true,
          campus: {
            select: { id: true, name: true, city: true, state: true },
          },
        },
      },
    },
  },
  options: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      text: true,
      sortOrder: true,
      _count: { select: { entries: true } },
    },
  },
} satisfies Prisma.PollInclude;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewer = await resolveViewerContext(session);

  const url = new URL(req.url);
  const filterTab = url.searchParams.get("filter")?.toUpperCase() ?? "ALL"; // ALL | MY_CAMPUS | CITY | STATE
  const geoType = url.searchParams.get("geoType")?.toUpperCase() ?? "ALL";
  const geoName = url.searchParams.get("geoName")?.trim() ?? "";
  const geoId = url.searchParams.get("geoId")?.trim() ?? "";
  const section =
    url.searchParams.get("section")?.toUpperCase() ||
    url.searchParams.get("tab")?.toUpperCase() ||
    "ALL"; // ALL | STUDENTS | FACULTY | ALUMNI
  const subFilter = url.searchParams.get("subFilter")?.toUpperCase() ?? "ALL"; // ALL | FOLLOWING | CONNECTED
  const tagParam = url.searchParams.get("tag")?.toLowerCase().trim().replace(/^#/, "");
  const campusesParam = url.searchParams.get("campuses");
  const campusIdParam = url.searchParams.get("campusId")?.trim();
  const selectedCampuses = campusesParam
    ? campusesParam
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    : campusIdParam
      ? [campusIdParam]
      : [];
  const pollTypeParam = url.searchParams.get("pollType")?.toUpperCase(); // GENERAL | COMPLAINT
  const complaintLevelParam = url.searchParams.get("complaintLevel")?.toUpperCase(); // GENERAL | CAMPUS | BATCH | SECTION
  const pollSectionParam = url.searchParams.get("pollSection")?.trim();
  const batchParam = url.searchParams.get("batch")?.trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30", 10), 50);

  // Auto-delete expired non-complaint polls where autoDeleteOnExpire is true:
  // Anonymize author identity and soft-delete so user's vote history is retained with [Deleted Poll] tag
  try {
    await db.poll.updateMany({
      where: {
        autoDeleteOnExpire: true,
        closesAt: { lte: new Date() },
        pollType: { not: "COMPLAINT" },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        isAnonymous: true,
      },
    });
  } catch {
    // Non-blocking cleanup
  }

  // Tag filter if specified: check taggable for POLL or POST
  let taggedPostIds: string[] | undefined = undefined;
  let taggedPollIds: string[] | undefined = undefined;
  if (tagParam) {
    const tagMatches = await db.taggable.findMany({
      where: {
        taggableType: { in: ["POLL", "POST"] },
        tag: { label: tagParam },
      },
      select: { taggableId: true, taggableType: true },
    });
    taggedPostIds = tagMatches.filter((t) => t.taggableType === "POST").map((t) => t.taggableId);
    taggedPollIds = tagMatches.filter((t) => t.taggableType === "POLL").map((t) => t.taggableId);

    if (taggedPostIds.length === 0 && taggedPollIds.length === 0) {
      return NextResponse.json({ polls: [] });
    }
  }

  const postWhere = buildPostAccessWhere(viewer, {
    tab: section !== "ALL" ? section : undefined,
    subFilter: subFilter !== "ALL" ? subFilter : undefined,
    taggedPostIds: taggedPostIds && taggedPostIds.length > 0 ? taggedPostIds : undefined,
  });

  // Resolve viewer campus city/state for MY_CAMPUS / CITY / STATE filters
  let viewerCampus: { id: string; name: string; city: string; state: string } | null = null;
  if (viewer.campusId) {
    viewerCampus = await db.campus.findUnique({
      where: { id: viewer.campusId },
      select: { id: true, name: true, city: true, state: true },
    });
  }

  const andPollWhere: Prisma.PollWhereInput[] = [{ post: postWhere }, { deletedAt: null }];

  if (pollTypeParam && (pollTypeParam === "GENERAL" || pollTypeParam === "COMPLAINT")) {
    andPollWhere.push({ pollType: pollTypeParam });
  }

  if (
    complaintLevelParam &&
    ["GENERAL", "CAMPUS", "BATCH", "SECTION"].includes(complaintLevelParam)
  ) {
    andPollWhere.push({ complaintLevel: complaintLevelParam });
  }

  if (batchParam) {
    const batchYear = parseInt(batchParam, 10);
    andPollWhere.push({
      OR: [
        { batch: batchParam },
        ...(isNaN(batchYear)
          ? []
          : [
              { post: { author: { joiningYear: batchYear } } },
              { post: { author: { studentAcademicDetails: { joinedYear: batchYear } } } },
            ]),
      ],
    });
  }

  if (pollSectionParam) {
    andPollWhere.push({ section: { equals: pollSectionParam, mode: "insensitive" } });
  }

  if (taggedPollIds && taggedPollIds.length > 0) {
    andPollWhere.push({
      OR: [
        { id: { in: taggedPollIds } },
        ...(taggedPostIds && taggedPostIds.length > 0 ? [{ postId: { in: taggedPostIds } }] : []),
      ],
    });
  }

  if (selectedCampuses.length > 0) {
    andPollWhere.push({
      OR: [
        { campusId: { in: selectedCampuses } },
        { campus: { slug: { in: selectedCampuses } } },
        { campus: { name: { in: selectedCampuses } } },
        { post: { author: { campus: { slug: { in: selectedCampuses } } } } },
        { post: { author: { campus: { name: { in: selectedCampuses } } } } },
        ...selectedCampuses.map((c) => ({
          scopeLabel: { contains: c, mode: "insensitive" as const },
        })),
      ],
    });
  }

  if (filterTab === "MY_CAMPUS") {
    if (!viewer.campusId) {
      return NextResponse.json({ polls: [] });
    }
    andPollWhere.push({
      OR: [{ campusId: viewer.campusId }, { post: { author: { campusId: viewer.campusId } } }],
    });
  } else if (filterTab === "CITY") {
    const city = viewerCampus?.city;
    if (city) {
      andPollWhere.push({
        OR: [
          { campus: { city: { equals: city, mode: "insensitive" } } },
          { scopeLabel: { contains: city, mode: "insensitive" } },
          { geoScope: "CITY" },
        ],
      });
    } else {
      andPollWhere.push({ geoScope: "CITY" });
    }
  } else if (filterTab === "STATE") {
    const state = viewerCampus?.state;
    if (state) {
      andPollWhere.push({
        OR: [
          { campus: { state: { equals: state, mode: "insensitive" } } },
          { scopeLabel: { contains: state, mode: "insensitive" } },
          { geoScope: "STATE" },
        ],
      });
    } else {
      andPollWhere.push({ geoScope: "STATE" });
    }
  }

  if (geoType !== "ALL" && geoName && geoName !== "All Campuses") {
    if (geoType === "CAMPUS" || geoType === "MY_CAMPUS") {
      andPollWhere.push({
        OR: [
          ...(geoId ? [{ campusId: geoId }, { campus: { slug: geoId } }] : []),
          { campus: { name: { contains: geoName, mode: "insensitive" } } },
          { scopeLabel: { contains: geoName, mode: "insensitive" } },
        ],
      });
    } else if (geoType === "CITY") {
      andPollWhere.push({
        OR: [
          { campus: { city: { equals: geoName, mode: "insensitive" } } },
          { scopeLabel: { contains: geoName, mode: "insensitive" } },
        ],
      });
    } else if (geoType === "STATE") {
      andPollWhere.push({
        OR: [
          { campus: { state: { equals: geoName, mode: "insensitive" } } },
          { scopeLabel: { contains: geoName, mode: "insensitive" } },
        ],
      });
    }
  }

  const sort = url.searchParams.get("sort");
  const candidateTake = sort === "recent" ? limit : Math.max(limit * 3, 50);

  const rawPolls = await db.poll.findMany({
    where: { AND: andPollWhere },
    orderBy: { createdAt: "desc" },
    take: candidateTake,
    include: POLL_INCLUDE,
  });

  // Defense-in-depth second verification
  const accessiblePolls = rawPolls.filter((poll) => canViewerAccessPost(viewer, poll.post));
  const rankedPolls = await rankPollCandidates(accessiblePolls, viewer, limit, { sort });
  const serialized = await serializePollsForViewer(rankedPolls, viewer);

  return NextResponse.json({ polls: serialized });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const actor = actorCheck.user;

  const rl = await rateLimit(
    `post:${actor.id}`,
    LIMITS.POST_CREATE.limit,
    LIMITS.POST_CREATE.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "You are creating polls too fast. Please slow down." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreatePollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid poll payload" },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const normalizedGeo = data.geoScope === "MY_CAMPUS" ? "CAMPUS" : data.geoScope;

  let resolvedCampusId: string | null = null;
  let resolvedScopeLabel = data.scopeLabel?.trim() || "All Campuses";

  if (normalizedGeo === "CAMPUS") {
    resolvedCampusId = data.campusId || actor.campusId || null;
    if (resolvedCampusId && (!data.scopeLabel || data.scopeLabel === "All Campuses")) {
      const c = await db.campus.findUnique({
        where: { id: resolvedCampusId },
        select: { name: true },
      });
      if (c) resolvedScopeLabel = c.name;
    } else if (!resolvedCampusId && actor.campusId) {
      resolvedCampusId = actor.campusId;
    }
  } else if (normalizedGeo === "CITY" || normalizedGeo === "STATE") {
    if (!data.scopeLabel && actor.campusId) {
      const c = await db.campus.findUnique({
        where: { id: actor.campusId },
        select: { city: true, state: true },
      });
      if (c) {
        resolvedScopeLabel = normalizedGeo === "CITY" ? `${c.city} City` : `${c.state} State`;
      }
    }
  }

  const visibility = data.targetConnectionScope === "CONNECTED" ? "CONNECTIONS" : "PUBLIC";

  const createdPoll = await db.$transaction(async (tx) => {
    const post = await tx.post.create({
      data: {
        authorId: actor.id,
        type: "POLL",
        visibility,
        targetConnectionScope: data.targetConnectionScope,
        targetRoles: data.targetRoles,
        batch: data.batch || (actor.joiningYear ? String(actor.joiningYear) : null),
        isAnonymous: data.isAnonymous,
        body: data.question,
        imageUrls: [],
      },
    });

    const poll = await tx.poll.create({
      data: {
        postId: post.id,
        question: data.question,
        isAnonymous: data.isAnonymous,
        allowMultipleAnswers: data.allowMultipleAnswers,
        submissionMode: data.submissionMode,
        geoScope: normalizedGeo,
        scopeLabel: resolvedScopeLabel,
        campusId: resolvedCampusId,
        targetConnectionScope: data.targetConnectionScope,
        targetRoles: data.targetRoles,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        pollType: data.pollType,
        complaintLevel: data.pollType === "COMPLAINT" ? data.complaintLevel || "GENERAL" : null,
        section: data.section || null,
        batch: data.batch || (actor.joiningYear ? String(actor.joiningYear) : null),
        autoDeleteOnExpire:
          data.pollType === "COMPLAINT" ? false : Boolean(data.autoDeleteOnExpire),
        options: {
          create: data.options.map((text, idx) => ({
            text,
            sortOrder: idx,
          })),
        },
      },
      include: POLL_INCLUDE,
    });

    if (data.tags && data.tags.length > 0) {
      for (const rawTag of data.tags) {
        const cleanLabel = rawTag.toLowerCase().trim().replace(/^#/, "");
        if (!cleanLabel) continue;
        const tagRecord = await tx.tag.upsert({
          where: { label: cleanLabel },
          create: { label: cleanLabel },
          update: {},
        });
        for (const taggableType of ["POLL", "POST"] as const) {
          await tx.taggable.upsert({
            where: {
              tagId_taggableType_taggableId: {
                tagId: tagRecord.id,
                taggableType,
                taggableId: taggableType === "POLL" ? poll.id : post.id,
              },
            },
            create: {
              tagId: tagRecord.id,
              taggableType,
              taggableId: taggableType === "POLL" ? poll.id : post.id,
            },
            update: {},
          });
        }
      }
    }

    return poll;
  });

  const [serialized] = await serializePollsForViewer([createdPoll], actor.id);
  return NextResponse.json({ poll: serialized }, { status: 201 });
}
