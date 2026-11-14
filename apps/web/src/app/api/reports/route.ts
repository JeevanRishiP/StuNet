/**
 * Reports API
 * POST /api/reports — create a report (authenticated, rate-limited)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { canViewerAccessPost, requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { z } from "zod";

const VALID_REASONS = [
  "SPAM",
  "HARASSMENT",
  "HATE_SPEECH",
  "MISINFORMATION",
  "INAPPROPRIATE_CONTENT",
  "IMPERSONATION",
  "OTHER",
] as const;

const ReportSchema = z.object({
  contentType: z.enum([
    "POST",
    "COMMENT",
    "CLUB",
    "GROUP",
    "USER_PROFILE",
    "MARKET_LISTING",
    "POLL_ENTRY",
  ]),
  postId: z.string().cuid().optional(),
  commentId: z.string().cuid().optional(),
  listingId: z.string().cuid().optional(),
  reportedUserId: z.string().cuid().optional(),
  reason: z.enum(VALID_REASONS),
  details: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const actor = actorCheck.user;

  // Rate limit: 5 reports per hour per user
  const rl = await rateLimit(
    `report:${actor.id}`,
    LIMITS.REPORT_SUBMIT.limit,
    LIMITS.REPORT_SUBMIT.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many reports submitted. Please wait before reporting again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(LIMITS.REPORT_SUBMIT.windowMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { contentType, postId, commentId, listingId, reportedUserId, reason, details } =
    parsed.data;

  // At least one target must be supplied
  if (!postId && !commentId && !listingId && !reportedUserId) {
    return NextResponse.json(
      {
        error: "At least one of postId, commentId, listingId, or reportedUserId is required",
      },
      { status: 422 },
    );
  }

  // If reporting a post, ensure viewer is allowed to see that post
  if (postId) {
    const viewer = await resolveViewerContext(session);
    const targetPost = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        targetConnectionScope: true,
        targetRoles: true,
        isAnonymous: true,
        isHidden: true,
        deletedAt: true,
        author: { select: { campusId: true } },
      },
    });
    if (!targetPost || !canViewerAccessPost(viewer, targetPost)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  const report = await db.report.create({
    data: {
      submitterId: actor.id,
      contentType,
      postId: postId ?? null,
      commentId: commentId ?? null,
      listingId: listingId ?? null,
      reportedUserId: reportedUserId ?? null,
      reason,
      details: details ?? null,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ id: report.id, createdAt: report.createdAt }, { status: 201 });
}
