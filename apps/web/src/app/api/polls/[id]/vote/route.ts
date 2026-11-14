/**
 * Poll Vote API
 * POST /api/polls/[id]/vote
 *
 * Supports all 4 behavioral combinations enforced by PostgreSQL triggers + transactions:
 *   - allowMultipleAnswers = false | true
 *   - submissionMode = SINGLE_SUBMIT (answer once via Submit button; locked permanently)
 *                    | MULTIPLE_SUBMIT (no submit button; instant toggle / change anytime)
 *
 * Returns updated poll options with percentages revealed ONLY once user has an active vote/submission.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { canViewerAccessPost, requireNonGuestUser, resolveViewerContext } from "@/lib/post-access";
import { serializePollsForViewer } from "@/lib/poll-serializer";
import { z } from "zod";

const VoteSchema = z.object({
  optionId: z.string().min(1).optional(),
  optionIds: z.array(z.string().min(1)).optional(),
  toggleOptionId: z.string().min(1).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }
  const actor = actorCheck.user;
  const viewer = await resolveViewerContext(session);

  const rl = await rateLimit(
    `pollvote:${actor.id}`,
    LIMITS.POLL_VOTE.limit,
    LIMITS.POLL_VOTE.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json({ error: "Voting too fast. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote input" }, { status: 422 });
  }

  const poll = await db.poll.findUnique({
    where: { id: params.id },
    include: {
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
          author: { select: { campusId: true } },
        },
      },
      options: { select: { id: true } },
    },
  });

  if (!poll || !canViewerAccessPost(viewer, poll.post)) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  if (poll.closesAt && poll.closesAt <= new Date()) {
    return NextResponse.json({ error: "This poll is closed" }, { status: 400 });
  }

  const validOptionIds = new Set(poll.options.map((o) => o.id));

  // Normalize requested selection state
  let requestedIds: string[] = [];
  if (parsed.data.optionIds !== undefined) {
    requestedIds = Array.from(
      new Set(parsed.data.optionIds.filter((id) => validOptionIds.has(id))),
    );
  } else if (parsed.data.optionId) {
    if (!validOptionIds.has(parsed.data.optionId)) {
      return NextResponse.json({ error: "Invalid poll option" }, { status: 422 });
    }
    requestedIds = [parsed.data.optionId];
  }

  const toggleId = parsed.data.toggleOptionId;
  if (toggleId && !validOptionIds.has(toggleId)) {
    return NextResponse.json({ error: "Invalid poll option" }, { status: 422 });
  }

  try {
    await db.$transaction(async (tx) => {
      const existingSubmission = await tx.pollSubmission.findUnique({
        where: { pollId_userId: { pollId: poll.id, userId: actor.id } },
        select: { id: true },
      });

      if (poll.submissionMode === "SINGLE_SUBMIT") {
        if (existingSubmission) {
          throw new Error("ALREADY_SUBMITTED");
        }
        const finalIds = toggleId ? [toggleId] : requestedIds;
        if (finalIds.length === 0) {
          throw new Error("OPTION_REQUIRED");
        }
        if (!poll.allowMultipleAnswers && finalIds.length > 1) {
          throw new Error("SINGLE_ANSWER_ONLY");
        }

        await tx.pollEntry.createMany({
          data: finalIds.map((optionId) => ({
            pollId: poll.id,
            optionId,
            creatorId: actor.id,
          })),
        });

        await tx.pollSubmission.create({
          data: {
            pollId: poll.id,
            userId: actor.id,
          },
        });
        return;
      }

      // MULTIPLE_SUBMIT (No Submit Button: live toggle / re-submittable anytime)
      const currentEntries = await tx.pollEntry.findMany({
        where: { pollId: poll.id, creatorId: actor.id },
        select: { id: true, optionId: true },
      });
      const currentIds = new Set(currentEntries.map((e) => e.optionId));

      let desiredIds: string[] = [];
      if (toggleId) {
        if (poll.allowMultipleAnswers) {
          const nextSet = new Set(currentIds);
          if (nextSet.has(toggleId)) nextSet.delete(toggleId);
          else nextSet.add(toggleId);
          desiredIds = Array.from(nextSet);
        } else {
          // Single-answer + Multiple-submit: switching options or unselecting if clicked again
          desiredIds = currentIds.has(toggleId) ? [] : [toggleId];
        }
      } else {
        if (!poll.allowMultipleAnswers && requestedIds.length > 1) {
          throw new Error("SINGLE_ANSWER_ONLY");
        }
        desiredIds = requestedIds;
      }

      const desiredSet = new Set(desiredIds);
      const toRemove = currentEntries
        .filter((e) => !desiredSet.has(e.optionId))
        .map((e) => e.optionId);
      const toAdd = desiredIds.filter((id) => !currentIds.has(id));

      if (toRemove.length > 0) {
        await tx.pollEntry.deleteMany({
          where: {
            pollId: poll.id,
            creatorId: actor.id,
            optionId: { in: toRemove },
          },
        });
      }

      if (toAdd.length > 0) {
        await tx.pollEntry.createMany({
          data: toAdd.map((optionId) => ({
            pollId: poll.id,
            optionId,
            creatorId: actor.id,
          })),
        });
      }

      if (desiredIds.length > 0) {
        await tx.pollSubmission.upsert({
          where: { pollId_userId: { pollId: poll.id, userId: actor.id } },
          create: { pollId: poll.id, userId: actor.id },
          update: { updatedAt: new Date() },
        });
      } else if (existingSubmission) {
        await tx.pollSubmission.delete({
          where: { pollId_userId: { pollId: poll.id, userId: actor.id } },
        });
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "ALREADY_SUBMITTED") {
      return NextResponse.json(
        { error: "You have already submitted your response to this poll." },
        { status: 409 },
      );
    }
    if (msg === "OPTION_REQUIRED") {
      return NextResponse.json({ error: "Please select at least one option." }, { status: 422 });
    }
    if (msg === "SINGLE_ANSWER_ONLY") {
      return NextResponse.json(
        { error: "This poll only allows selecting a single option." },
        { status: 422 },
      );
    }
    throw err;
  }

  // Re-fetch serialized poll with updated totals and conditional percentages
  const refreshed = await db.poll.findUnique({
    where: { id: poll.id },
    include: {
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
          author: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
              campusId: true,
              campus: { select: { id: true, name: true, city: true, state: true } },
            },
          },
        },
      },
      options: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          text: true,
          sortOrder: true,
          _count: { select: { entries: true } },
        },
      },
    },
  });

  if (!refreshed) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const [serialized] = await serializePollsForViewer([refreshed], actor.id);
  return NextResponse.json({ poll: serialized });
}
