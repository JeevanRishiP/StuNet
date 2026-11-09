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
  user_id: string;
  name: string;
  role: string;
  priority: number;
}

export async function getPostLikedBySummary(
  postId: string,
  likeCount: number,
  viewerId?: string | null,
  viewerCampusId?: string | null,
): Promise<LikedByResult> {
  if (likeCount <= 0) {
    return {
      likeCount: 0,
      viewerHasLiked: false,
      featuredName: null,
      displayString: "",
    };
  }

  // Check if viewer has liked
  let viewerHasLiked = false;
  if (viewerId) {
    const existing = await db.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: viewerId,
        },
      },
      select: { userId: true },
    });
    viewerHasLiked = Boolean(existing);
  }

  if (!viewerId) {
    return {
      likeCount,
      viewerHasLiked: false,
      featuredName: null,
      displayString: likeCount === 1 ? "1 person liked this" : `${likeCount} people liked this`,
    };
  }

  // Execute prioritized query from Section 6
  try {
    const rawLikers = await db.$queryRaw<RawLikerRow[]>(
      Prisma.sql`
        SELECT pl.user_id, ui.display_name AS name, ui.role,
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
        WHERE pl.post_id = ${postId}
        ORDER BY priority ASC, pl.created_at DESC
        LIMIT 1;
      `,
    );

    const top = rawLikers[0];

    // Priority 1, 2, 3 represent someone the viewer knows / campus faculty
    if (top && top.priority <= 3 && top.name) {
      const othersCount = likeCount - 1;
      const displayString =
        likeCount === 1
          ? `${top.name} liked this`
          : `${top.name} and ${othersCount} ${othersCount === 1 ? "other" : "others"} liked this`;

      return {
        likeCount,
        viewerHasLiked,
        featuredName: top.name,
        displayString,
      };
    }

    // Fallback: If no acquaintance liked it, degrade cleanly to plain count
    return {
      likeCount,
      viewerHasLiked,
      featuredName: null,
      displayString: likeCount === 1 ? "1 person liked this" : `${likeCount} people liked this`,
    };
  } catch (_err) {
    // Graceful fallback on query failure
    return {
      likeCount,
      viewerHasLiked,
      featuredName: null,
      displayString: likeCount === 1 ? "1 person liked this" : `${likeCount} people liked this`,
    };
  }
}
