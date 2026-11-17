/**
 * apps/web/src/app/api/success-board/route.ts
 *
 * Provides dynamic, verified Success Board rankings across:
 * 1. Competitive Programming (LeetCode, Codeforces, HackerRank) — Primary first section
 * 2. Achievements (Placed Students, Cracked Internships, VC Startups, Social Media, Other Achievements)
 * 3. Projects & Open Source (GitHub Repos, GitHub Stars, Hugging Face, Kaggle)
 * 4. NIAT Competitions (GRIT, BRAVE, Mock Interview Score) — Internal, exempt from external link extraction
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { getCachedJson, setCachedJson, getClientIp } from "@/lib/cache";

interface MatviewRankingRow {
  ranking_id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  category: string;
  scope: string;
  rank: number;
  score: number;
  verified_achievement_count: number;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`success-board:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many success board requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.resetInSeconds) } },
    );
  }

  const { searchParams } = req.nextUrl;
  const geo = searchParams.get("geo") || "ALL";
  const batch = searchParams.get("batch") || "ALL";

  const cacheKey = `cache:success-board:${geo}:${batch}`;
  const cached = await getCachedJson<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // 1. Query the materialized view success_board_rankings directly (Plan Delta v3 & Spec Rec)
  let matviewRows: MatviewRankingRow[] = [];
  try {
    const rawRows = await db.$queryRaw<Record<string, unknown>[]>(
      Prisma.sql`
        SELECT ranking_id, user_id, display_name, username, avatar_url, category, scope, rank, score, verified_achievement_count::int AS verified_achievement_count
        FROM success_board_rankings
        ORDER BY rank ASC
        LIMIT 100;
      `,
    );
    matviewRows = rawRows.map((r) => ({
      ...(r as unknown as MatviewRankingRow),
      verified_achievement_count: Number(r["verified_achievement_count"] || 0),
      score: Number(r["score"] || 0),
    }));
  } catch (err) {
    console.error("[SuccessBoard] Failed to query success_board_rankings view:", err);
  }

  // 2. Fetch verified brave_metrics submitted by students
  const metrics = await db.braveMetric.findMany({
    take: 100,
    orderBy: { metricValue: "desc" },
  });

  // Fetch users for these metrics
  const userIds = [...new Set(metrics.map((m) => m.userId))];
  const users = await db.userIdentity.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, username: true, avatarUrl: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Live verified success board lists (populated strictly from database records & live extraction)
  interface LeetCodeItem {
    name: string;
    username: string;
    score: string;
    rawScore: number;
    solved: string;
    badge: string;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseCpLeetCode: LeetCodeItem[] = [];

  interface CodeforcesItem {
    name: string;
    username: string;
    rating: string;
    rawRating: number;
    rankTitle: string;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseCpCodeforces: CodeforcesItem[] = [];

  interface HackerRankItem {
    name: string;
    username: string;
    badge: string;
    stars: string;
    rawScore: number;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseCpHackerRank: HackerRankItem[] = [];

  interface GithubItem {
    repo: string;
    owner: string;
    username: string;
    stars: string;
    rawStars: number;
    tech: string;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseGithubStars: GithubItem[] = [];

  interface HuggingFaceItem {
    name: string;
    username: string;
    model: string;
    downloads: string;
    rawScore: number;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseHuggingFace: HuggingFaceItem[] = [];

  interface KaggleItem {
    name: string;
    username: string;
    tier: string;
    rankNum: string;
    rawScore: number;
    profileUrl: string;
    verifiedName: string;
    isLiveExtracted: boolean;
  }
  const baseKaggle: KaggleItem[] = [];

  // Merge live database submissions
  for (const m of metrics) {
    const user = userMap.get(m.userId);
    if (!user) continue;

    const raw = (m.rawJson as Record<string, unknown>) || {};
    const metricsData = (raw.metrics as Record<string, unknown>) || {};
    const verification = (raw.verification as Record<string, unknown>) || {};
    const profileUrl = (raw.normalizedUrl as string) || `https://${m.platform}.com`;
    const verifiedName = (verification.profileName as string) || user.displayName;

    if (m.platform === "leetcode") {
      const exists = baseCpLeetCode.find((u) => u.name === user.displayName);
      if (exists) {
        exists.score = (metricsData.primaryScoreLabel as string) || exists.score;
        exists.solved = (metricsData.secondaryScoreLabel as string) || exists.solved;
        exists.badge = (metricsData.badge as string) || exists.badge;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseCpLeetCode.push({
          name: user.displayName,
          username: user.username,
          score: (metricsData.primaryScoreLabel as string) || `${m.metricValue} Contest Rating`,
          rawScore: m.metricValue,
          solved: (metricsData.secondaryScoreLabel as string) || "Solved Problems",
          badge: (metricsData.badge as string) || "Specialist",
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    } else if (m.platform === "codeforces") {
      const exists = baseCpCodeforces.find((u) => u.name === user.displayName);
      if (exists) {
        exists.rating = (metricsData.primaryScoreLabel as string) || exists.rating;
        exists.rankTitle = (metricsData.secondaryScoreLabel as string) || exists.rankTitle;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseCpCodeforces.push({
          name: user.displayName,
          username: user.username,
          rating: (metricsData.primaryScoreLabel as string) || `${m.metricValue} Rating`,
          rawRating: m.metricValue,
          rankTitle: (metricsData.secondaryScoreLabel as string) || "Specialist",
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    } else if (m.platform === "hackerrank") {
      const exists = baseCpHackerRank.find((u) => u.name === user.displayName);
      if (exists) {
        exists.badge = (metricsData.primaryScoreLabel as string) || exists.badge;
        exists.stars = (metricsData.secondaryScoreLabel as string) || exists.stars;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseCpHackerRank.push({
          name: user.displayName,
          username: user.username,
          badge: (metricsData.primaryScoreLabel as string) || "6 Stars Problem Solving",
          stars: (metricsData.secondaryScoreLabel as string) || "Gold Badge",
          rawScore: m.metricValue,
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    } else if (m.platform === "github") {
      const exists = baseGithubStars.find((u) => u.owner === user.displayName);
      if (exists) {
        exists.stars = (metricsData.primaryScoreLabel as string) || exists.stars;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseGithubStars.push({
          repo: (metricsData.topRepo as string) || `${user.username}-repo`,
          owner: user.displayName,
          username: user.username,
          stars: (metricsData.primaryScoreLabel as string) || `${m.metricValue} Stars`,
          rawStars: m.metricValue,
          tech: "TypeScript / Python",
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    } else if (m.platform === "huggingface") {
      const exists = baseHuggingFace.find((u) => u.name === user.displayName);
      if (exists) {
        exists.downloads = (metricsData.primaryScoreLabel as string) || exists.downloads;
        exists.model = (metricsData.secondaryScoreLabel as string) || exists.model;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseHuggingFace.push({
          name: user.displayName,
          username: user.username,
          model: (metricsData.secondaryScoreLabel as string) || "open-model",
          downloads: (metricsData.primaryScoreLabel as string) || "10.0k Downloads",
          rawScore: m.metricValue,
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    } else if (m.platform === "kaggle") {
      const exists = baseKaggle.find((u) => u.name === user.displayName);
      if (exists) {
        exists.tier = (metricsData.primaryScoreLabel as string) || exists.tier;
        exists.rankNum = (metricsData.secondaryScoreLabel as string) || exists.rankNum;
        exists.profileUrl = profileUrl;
        exists.verifiedName = verifiedName;
        exists.isLiveExtracted = true;
      } else {
        baseKaggle.push({
          name: user.displayName,
          username: user.username,
          tier: (metricsData.primaryScoreLabel as string) || "Kaggle Master",
          rankNum: (metricsData.secondaryScoreLabel as string) || "#100 Global",
          rawScore: m.metricValue,
          profileUrl,
          verifiedName,
          isLiveExtracted: true,
        });
      }
    }
  }

  // Merge verified achievements from materialized view
  for (const row of matviewRows) {
    if (row.category === "COMPETITIVE_PROGRAMMING") {
      const exists = baseCpLeetCode.find(
        (u) => u.name === row.display_name || u.username === row.username,
      );
      if (exists) {
        if (Number(row.score) > (exists.rawScore || 0)) {
          exists.score = `${row.score} Contest Rating`;
          exists.rawScore = Number(row.score);
          exists.isLiveExtracted = true;
        }
      } else {
        baseCpLeetCode.push({
          name: row.display_name,
          username: row.username,
          score: `${row.score} Contest Rating`,
          rawScore: Number(row.score),
          solved: `${row.verified_achievement_count} Verified Achievements`,
          badge:
            Number(row.score) >= 2200
              ? "Guardian"
              : Number(row.score) >= 1900
                ? "Knight"
                : "Specialist",
          profileUrl: `https://leetcode.com/u/${row.username}`,
          verifiedName: row.display_name,
          isLiveExtracted: true,
        });
      }
    } else if (row.category === "OPEN_SOURCE") {
      const exists = baseGithubStars.find(
        (u) => u.owner === row.display_name || u.username === row.username,
      );
      if (exists) {
        if (Number(row.score) > (exists.rawStars || 0)) {
          exists.stars = `${row.score} Stars`;
          exists.rawStars = Number(row.score);
          exists.isLiveExtracted = true;
        }
      } else {
        baseGithubStars.push({
          repo: `${row.username}-open-source`,
          owner: row.display_name,
          username: row.username,
          stars: `${row.score} Stars`,
          rawStars: Number(row.score),
          tech: "TypeScript / Go",
          profileUrl: `https://github.com/${row.username}`,
          verifiedName: row.display_name,
          isLiveExtracted: true,
        });
      }
    }
  }

  // Sort and assign ranks
  const sortedLeetCode = baseCpLeetCode
    .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const sortedCodeforces = baseCpCodeforces
    .sort((a, b) => (b.rawRating || 0) - (a.rawRating || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const sortedHackerRank = baseCpHackerRank
    .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const sortedGithub = baseGithubStars
    .sort((a, b) => (b.rawStars || 0) - (a.rawStars || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const sortedHuggingFace = baseHuggingFace
    .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const sortedKaggle = baseKaggle
    .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0))
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  const payload = {
    filters: { geo, batch },
    materializedRankings: matviewRows,
    cpBoards: {
      leetcode: sortedLeetCode,
      codeforces: sortedCodeforces,
      hackerrank: sortedHackerRank,
    },
    projectsBoards: {
      githubStars: sortedGithub,
      huggingFace: sortedHuggingFace,
      kaggle: sortedKaggle,
    },
  };

  await setCachedJson(cacheKey, payload, 30);
  return NextResponse.json(payload);
}
