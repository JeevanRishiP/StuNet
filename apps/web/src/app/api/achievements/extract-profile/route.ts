/**
 * apps/web/src/app/api/achievements/extract-profile/route.ts
 *
 * Endpoint to submit a profile link, extract data, and enforce student identity name verification.
 * "Make sure that the name of the profile link provided and the name of the student matters.
 *  This follows for all GitHub hacker rank, leet code, code force, hugging face, kaggle, another achievements board accept NIAT competitions"
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  parseProfileUrl,
  extractPlatformProfile,
  verifyStudentName,
  PlatformType,
} from "@/lib/externalPlatforms";
import { ProfilePlatform, Prisma } from "@prisma/client";
import { z } from "zod";

const SubmitProfileSchema = z.object({
  platform: z.enum([
    "LEETCODE",
    "CODEFORCES",
    "HACKERRANK",
    "GITHUB",
    "HUGGINGFACE",
    "KAGGLE",
    "LINKEDIN",
    "PORTFOLIO",
    "OTHER",
  ]),
  profileUrl: z.string().url().max(2000),
  studentId: z.string().optional(),
});

const PLATFORM_TO_PRISMA_MAP: Record<string, ProfilePlatform> = {
  LEETCODE: ProfilePlatform.LEETCODE,
  CODEFORCES: ProfilePlatform.CODEFORCES,
  HACKERRANK: ProfilePlatform.HACKERRANK,
  GITHUB: ProfilePlatform.GITHUB,
  HUGGINGFACE: ProfilePlatform.HUGGINGFACE,
  KAGGLE: ProfilePlatform.KAGGLE,
  LINKEDIN: ProfilePlatform.LINKEDIN,
  PORTFOLIO: ProfilePlatform.PORTFOLIO,
  OTHER: ProfilePlatform.PORTFOLIO,
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const parsed = SubmitProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid submission data" },
      { status: 422 },
    );
  }

  const { platform, profileUrl, studentId } = parsed.data;

  // 1. Resolve student identity
  let targetUserId = session?.user?.id;
  if (studentId) {
    targetUserId = studentId;
  }

  // Fallback to active student if in demo/dev mode without active session
  let student = null;
  if (targetUserId) {
    student = await db.userIdentity.findUnique({
      where: { id: targetUserId },
      select: { id: true, displayName: true, username: true, campusId: true },
    });
  }

  if (!student) {
    // Look up default student representative (Jeevan Rishi P or first student)
    student = await db.userIdentity.findFirst({
      where: { role: "STUDENT" },
      select: { id: true, displayName: true, username: true, campusId: true },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!student) {
    return NextResponse.json(
      { error: "No student profile found for verification" },
      { status: 404 },
    );
  }

  // 2. Parse URL and detect handle
  const parsedUrl = parseProfileUrl(profileUrl, platform);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: `Could not parse handle from URL: ${profileUrl}` },
      { status: 400 },
    );
  }

  // 3. Automatically extract required data from the platform
  const extracted = await extractPlatformProfile(
    platform as PlatformType,
    profileUrl,
    student.displayName,
  );

  // 4. Verify that the name of the profile link provided and the name of the student match!
  const verification = verifyStudentName(
    student.displayName,
    extracted.profileName,
    extracted.handle,
    student.username,
  );

  // Strict check: If MISMATCH, reject submission
  if (!verification.isMatch) {
    return NextResponse.json(
      {
        success: false,
        status: "MISMATCH",
        verification,
        extracted,
        student: {
          id: student.id,
          displayName: student.displayName,
          username: student.username,
        },
        error: verification.reason,
        message: verification.reason,
      },
      { status: 422 },
    );
  }

  // 5. Store / update in database: ProfileLink, BraveMetric, Achievement
  try {
    const prismaPlatform = PLATFORM_TO_PRISMA_MAP[platform] || ProfilePlatform.PORTFOLIO;

    // A. Upsert ProfileLink
    await db.profileLink.upsert({
      where: {
        userId_platform: {
          userId: student.id,
          platform: prismaPlatform,
        },
      },
      update: {
        url: extracted.normalizedUrl,
      },
      create: {
        userId: student.id,
        platform: prismaPlatform,
        url: extracted.normalizedUrl,
      },
    });

    // B. Upsert BraveMetric
    const primaryValue =
      extracted.metrics.rating ||
      extracted.metrics.totalStars ||
      extracted.metrics.problemsSolved ||
      extracted.metrics.modelsCount ||
      100;

    await db.braveMetric.upsert({
      where: {
        userId_platform_metricKey: {
          userId: student.id,
          platform: platform.toLowerCase(),
          metricKey: "score",
        },
      },
      update: {
        metricValue: Number(primaryValue),
        lastSyncedAt: new Date(),
        // JSON round-trip converts typed interfaces → plain object for Prisma InputJsonValue
        rawJson: JSON.parse(
          JSON.stringify({ ...extracted, verification, lastVerifiedAt: new Date().toISOString() }),
        ) as Prisma.InputJsonObject,
      },
      create: {
        userId: student.id,
        platform: platform.toLowerCase(),
        metricKey: "score",
        metricValue: Number(primaryValue),
        rawJson: JSON.parse(
          JSON.stringify({ ...extracted, verification, lastVerifiedAt: new Date().toISOString() }),
        ) as Prisma.InputJsonObject,
      },
    });

    // C. Upsert / Create Achievement entry
    const category =
      platform === "LEETCODE" || platform === "CODEFORCES" || platform === "HACKERRANK"
        ? "COMPETITIVE_PROGRAMMING"
        : platform === "GITHUB" || platform === "HUGGINGFACE"
          ? "OPEN_SOURCE"
          : "HACKATHON";

    const title = `${capitalize(platform)}: ${extracted.metrics.primaryScoreLabel}`;
    const description = `Verified profile milestone. Extracted: ${extracted.metrics.primaryScoreLabel} (${extracted.metrics.secondaryScoreLabel}). Identity Verified: "${extracted.profileName || extracted.handle}" matches student "${student.displayName}".`;

    await db.achievement.create({
      data: {
        userId: student.id,
        title,
        description,
        category,
        scope: "CAMPUS",
        platform: capitalize(platform),
        proofUrl: extracted.normalizedUrl,
        achievedAt: new Date(),
        verificationStatus: "VERIFIED",
        verifiedAt: new Date(),
        externalScore: Math.round(primaryValue),
      },
    });

    return NextResponse.json({
      success: true,
      status: verification.status,
      verification,
      extracted,
      student: {
        id: student.id,
        displayName: student.displayName,
        username: student.username,
      },
      message: `Profile successfully verified and added to the board! (${verification.reason})`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Database save failed", detail: String(err) },
      { status: 500 },
    );
  }
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
