/**
 * apps/web/src/lib/engagement.ts
 *
 * Post Engagement Engine (Plan Delta v3):
 * - Instagram-style "Liked by" candidate resolution.
 * - Priority order:
 *   1. Connected FACULTY
 *   2. Campus FACULTY (even without connection)
 *   3. Connected STUDENT or ALUMNI
 *   4. Anyone else (falls back to plain count)
 */
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface LikedByResult {
  likeCount: number;
  viewerHasLiked: boolean;
  featuredName: string | null;
  displayString: string;
}

interface RawLikerRow {
  post_id?: string;
  user_id: string;
  name: string;
  role: string;
  priority: number;
}

export async function getBatchPostLikedBySummary(
  posts: Array<{ id: string; likeCount: number }>,
  viewerId?: string | null,
  viewerCampusId?: string | null,
): Promise<Map<string, LikedByResult>> {
  const resultMap = new Map<string, LikedByResult>();

  if (posts.length === 0) {
    return resultMap;
  }

  // Pre-fill defaults
  const postsWithLikes = posts.filter((p) => p.likeCount > 0);
  for (const p of posts) {
    if (p.likeCount <= 0) {
      resultMap.set(p.id, {
        likeCount: 0,
        viewerHasLiked: false,
        featuredName: null,
        displayString: "",
      });
    } else {
      resultMap.set(p.id, {
        likeCount: p.likeCount,
        viewerHasLiked: false,
        featuredName: null,
        displayString:
          p.likeCount === 1 ? "1 person liked this" : `${p.likeCount} people liked this`,
      });
    }
  }

  if (postsWithLikes.length === 0) {
    return resultMap;
  }

  const postIdsWithLikes = postsWithLikes.map((p) => p.id);

  // Check viewer likes in batch
  const userLikedPostIds = new Set<string>();
  if (viewerId) {
    try {
      const viewerLikes = await db.postLike.findMany({
        where: {
          postId: { in: postIdsWithLikes },
          userId: viewerId,
        },
        select: { postId: true },
      });
      for (const l of viewerLikes) {
        userLikedPostIds.add(l.postId);
      }
    } catch (err) {
      console.error("[Engagement] Failed to batch fetch viewer likes:", err);
    }
  }

  // If no viewerId, update viewerHasLiked to false and return
  if (!viewerId) {
    return resultMap;
  }

  // Query prioritized likers in batch
  try {
    const rawLikers = await db.$queryRaw<RawLikerRow[]>(
      Prisma.sql`
        SELECT DISTINCT ON (pl.post_id)
          pl.post_id,
          pl.user_id,
          ui.display_name AS name,
          ui.role,
          CASE
            WHEN c.status = 'ACCEPTED' AND ui.role = 'FACULTY' THEN 1
            WHEN ui.role = 'FACULTY' AND ui.campus_id = ${viewerCampusId ?? ""} THEN 2
            WHEN c.status = 'ACCEPTED' AND ui.role IN ('STUDENT','ALUMNI') THEN 3
            ELSE 4
          END AS priority
        FROM post_likes pl
        JOIN user_identity ui ON ui.id = pl.user_id
        LEFT JOIN connections c ON (c.sender_id = ${viewerId} AND c.receiver_id = pl.user_id)
                                OR (c.receiver_id = ${viewerId} AND c.sender_id = pl.user_id)
        WHERE pl.post_id IN (${Prisma.join(postIdsWithLikes)})
        ORDER BY pl.post_id, priority ASC, pl.created_at DESC;
      `,
    );

    const topLikerMap = new Map<string, RawLikerRow>();
    for (const row of rawLikers) {
      if (row.post_id) {
        topLikerMap.set(row.post_id, row);
      }
    }

    for (const p of postsWithLikes) {
      const viewerHasLiked = userLikedPostIds.has(p.id);
      const top = topLikerMap.get(p.id);

      if (top && Number(top.priority) <= 3 && top.name) {
        const othersCount = p.likeCount - 1;
        const displayString =
          p.likeCount === 1
            ? `${top.name} liked this`
            : `${top.name} and ${othersCount} ${othersCount === 1 ? "other" : "others"} liked this`;

        resultMap.set(p.id, {
          likeCount: p.likeCount,
          viewerHasLiked,
          featuredName: top.name,
          displayString,
        });
      } else {
        resultMap.set(p.id, {
          likeCount: p.likeCount,
          viewerHasLiked,
          featuredName: null,
          displayString:
            p.likeCount === 1 ? "1 person liked this" : `${p.likeCount} people liked this`,
        });
      }
    }
  } catch (err) {
    console.error("[Engagement] Failed to batch resolve prioritized likers:", err);
    for (const p of postsWithLikes) {
      const prev = resultMap.get(p.id);
      if (prev) {
        resultMap.set(p.id, {
          ...prev,
          viewerHasLiked: userLikedPostIds.has(p.id),
        });
      }
    }
  }

  return resultMap;
}

export async function getPostLikedBySummary(
  postId: string,
  likeCount: number,
  viewerId?: string | null,
  viewerCampusId?: string | null,
): Promise<LikedByResult> {
  const batch = await getBatchPostLikedBySummary(
    [{ id: postId, likeCount }],
    viewerId,
    viewerCampusId,
  );
  return (
    batch.get(postId) ?? {
      likeCount,
      viewerHasLiked: false,
      featuredName: null,
      displayString: likeCount === 1 ? "1 person liked this" : `${likeCount} people liked this`,
    }
  );
}
