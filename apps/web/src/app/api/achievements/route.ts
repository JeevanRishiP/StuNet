import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const VALID_CATEGORIES = [
  "COMPETITIVE_PROGRAMMING",
  "OPEN_SOURCE",
  "RESEARCH",
  "HACKATHON",
  "CERTIFICATION",
  "SPORTS",
  "CULTURAL",
  "ACADEMIC",
] as const;

const VALID_SCOPES = ["CAMPUS", "INTER_COLLEGE", "STATE", "NATIONAL", "INTERNATIONAL"] as const;

type AchievementCategory = (typeof VALID_CATEGORIES)[number];
type AchievementScope = (typeof VALID_SCOPES)[number];

// GET /api/achievements — list current user's achievements
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const achievements = await db.achievement.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      scope: true,
      platform: true,
      proofUrl: true,
      achievedAt: true,
      verificationStatus: true,
      rejectionReason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ achievements });
}

// POST /api/achievements — submit a new achievement for verification
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: max 5 submissions per hour per user
  const limited = await rateLimit(`achievement:${session.user.id}`, 5, 3600);
  if (limited) {
    return NextResponse.json(
      { error: "Too many submissions — wait before submitting again" },
      { status: 429 },
    );
  }

  // Must be verified to submit achievements
  const identity = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { verificationStatus: true, isBanned: true },
  });

  if (!identity || identity.isBanned) {
    return NextResponse.json({ error: "Account not eligible" }, { status: 403 });
  }
  if (identity.verificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Only verified users can submit achievements" },
      { status: 403 },
    );
  }

  let body: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    scope?: unknown;
    platform?: unknown;
    proofUrl?: unknown;
    proofDocumentUrl?: unknown;
    achievedAt?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : null;
  const description = typeof body.description === "string" ? body.description.trim() : null;
  const category = VALID_CATEGORIES.includes(body.category as AchievementCategory)
    ? (body.category as AchievementCategory)
    : null;
  const scope = VALID_SCOPES.includes(body.scope as AchievementScope)
    ? (body.scope as AchievementScope)
    : null;
  const platform = typeof body.platform === "string" ? body.platform.trim() || null : null;
  const proofUrl = typeof body.proofUrl === "string" ? body.proofUrl.trim() || null : null;
  const proofDocumentUrl =
    typeof body.proofDocumentUrl === "string" ? body.proofDocumentUrl.trim() || null : null;
  const achievedAtRaw = typeof body.achievedAt === "string" ? new Date(body.achievedAt) : null;

  if (!title || !category || !scope || !achievedAtRaw || isNaN(achievedAtRaw.getTime())) {
    return NextResponse.json(
      { error: "title, category, scope, and achievedAt are required" },
      { status: 400 },
    );
  }

  if (title.length > 200) {
    return NextResponse.json({ error: "title max 200 chars" }, { status: 422 });
  }

  const achievement = await db.achievement.create({
    data: {
      userId: session.user.id,
      title,
      description: description || null,
      category,
      scope,
      platform,
      proofUrl,
      proofDocumentUrl,
      achievedAt: achievedAtRaw,
      verificationStatus: "PENDING",
    },
    select: {
      id: true,
      title: true,
      category: true,
      scope: true,
      verificationStatus: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ achievement }, { status: 201 });
}
