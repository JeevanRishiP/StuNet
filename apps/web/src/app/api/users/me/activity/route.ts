/**
 * /api/users/me/activity
 *
 * Instagram-style user activity center:
 * 1. likes: posts and polls liked by the user (allows toggle like/unlike)
 * 2. comments: comments made by user (allows edit and delete)
 * 3. votes: polls answered by user (changeable if MULTIPLE_SUBMIT, locked if SINGLE_SUBMIT;
 *           if expired & auto-deleted, creator is anonymized with isDeleted flag).
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;

  try {
    const [likes, comments, pollEntries] = await Promise.all([
      // 1. Likes
      db.postLike.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            select: {
              id: true,
              body: true,
              likeCount: true,
              commentCount: true,
              createdAt: true,
              imageUrls: true,
              author: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                  role: true,
                },
              },
              poll: {
                select: {
                  id: true,
                  question: true,
                  pollType: true,
                },
              },
            },
          },
        },
      }),

      // 2. Comments authored by user
      db.postComment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            select: {
              id: true,
              body: true,
              author: {
                select: {
                  displayName: true,
                  username: true,
                },
              },
            },
          },
        },
      }),

      // 3. User's Poll Entries (answers)
      db.pollEntry.findMany({
        where: { creatorId: userId },
        orderBy: { createdAt: "desc" },
        include: {
          option: {
            select: {
              id: true,
              text: true,
              pollId: true,
            },
          },
          poll: {
            include: {
              options: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  text: true,
                  sortOrder: true,
                  _count: { select: { entries: true } },
                },
              },
              post: {
                select: {
                  id: true,
                  deletedAt: true,
                  author: {
                    select: {
                      id: true,
                      displayName: true,
                      username: true,
                      avatarUrl: true,
                      role: true,
                      campus: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Aggregate user selections per poll
    const pollMap = new Map<
      string,
      {
        poll: (typeof pollEntries)[0]["poll"];
        selectedOptionIds: string[];
      }
    >();

    for (const entry of pollEntries) {
      if (!entry.poll) continue;
      const existing = pollMap.get(entry.poll.id);
      if (!existing) {
        pollMap.set(entry.poll.id, {
          poll: entry.poll,
          selectedOptionIds: [entry.optionId],
        });
      } else {
        if (!existing.selectedOptionIds.includes(entry.optionId)) {
          existing.selectedOptionIds.push(entry.optionId);
        }
      }
    }

    const votes = Array.from(pollMap.values()).map(({ poll, selectedOptionIds }) => {
      const isExpired = poll.closesAt ? new Date(poll.closesAt) <= new Date() : false;
      const isDeleted = Boolean(poll.deletedAt || (poll.autoDeleteOnExpire && isExpired));

      const totalOptionsVotes = poll.options.reduce((sum, o) => sum + o._count.entries, 0);

      const options = poll.options.map((opt) => {
        const votes = opt._count.entries;
        const pct = totalOptionsVotes > 0 ? Math.round((votes / totalOptionsVotes) * 100) : 0;
        return {
          id: opt.id,
          text: opt.text,
          sortOrder: opt.sortOrder,
          votes,
          percent: pct,
        };
      });

      return {
        id: poll.id,
        postId: poll.postId,
        question: poll.question,
        pollType: poll.pollType,
        complaintLevel: poll.complaintLevel,
        section: poll.section,
        submissionMode: poll.submissionMode,
        allowMultipleAnswers: poll.allowMultipleAnswers,
        isDeleted,
        selectedOptionIds,
        options,
        totalVotes: totalOptionsVotes,
        closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
        createdAt: poll.createdAt.toISOString(),
        // Redact creator info if deleted or anonymous
        authorName: isDeleted
          ? "[Deleted Poll Creator]"
          : poll.isAnonymous
            ? "Anonymous Student"
            : poll.post.author.displayName,
        authorUsername: isDeleted || poll.isAnonymous ? null : poll.post.author.username,
        authorAvatarUrl: isDeleted || poll.isAnonymous ? null : poll.post.author.avatarUrl,
        authorRole: isDeleted || poll.isAnonymous ? "STUDENT" : poll.post.author.role,
        authorCampus:
          isDeleted || poll.isAnonymous
            ? null
            : poll.post.author.campus
              ? { name: poll.post.author.campus.name }
              : null,
      };
    });

    const serializedLikes = likes.map((like) => ({
      id: `${like.userId}-${like.postId}`,
      postId: like.postId,
      createdAt: like.createdAt.toISOString(),
      post: {
        id: like.post.id,
        body: like.post.body,
        likeCount: like.post.likeCount,
        commentCount: like.post.commentCount,
        createdAt: like.post.createdAt.toISOString(),
        imageUrls: like.post.imageUrls,
        author: like.post.author,
        isPoll: Boolean(like.post.poll),
        pollQuestion: like.post.poll?.question ?? null,
      },
    }));

    const serializedComments = comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      postSnippet: c.post.body ? c.post.body.slice(0, 100) : "Post",
      postAuthorName: c.post.author.displayName,
    }));

    return NextResponse.json({
      likes: serializedLikes,
      comments: serializedComments,
      votes,
    });
  } catch (err) {
    console.error("GET /api/users/me/activity error:", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
