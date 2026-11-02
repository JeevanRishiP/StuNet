/**
 * Campus Marketplace API — Student Portal
 * GET  /api/marketplace — list active listings for user's campus (block-filtered)
 * POST /api/marketplace — create a listing (rate-limited: 5/day)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { z } from "zod";

const ListingSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  priceInr: z.number().positive().max(100000),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR"]),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true },
  });

  // Collect blocked user IDs for filtering
  const blocks = await db.userBlock.findMany({
    where: {
      OR: [{ initiatorId: session.user.id }, { targetId: session.user.id }],
    },
    select: { initiatorId: true, targetId: true },
  });
  const blockedIds = new Set<string>();
  blocks.forEach((b) => {
    blockedIds.add(b.initiatorId);
    blockedIds.add(b.targetId);
  });
  blockedIds.delete(session.user.id); // don't exclude self

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);

  const listings = await db.campusMarketListing.findMany({
    where: {
      status: "ACTIVE",
      flaggedAt: null, // hide flagged listings
      ...(user?.campusId ? { campusId: user.campusId } : {}),
      sellerId: { notIn: Array.from(blockedIds) },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceInr: true,
      condition: true,
      createdAt: true,
      sellerId: true,
      seller: { select: { displayName: true, username: true, avatarUrl: true } },
      images: { select: { url: true, altText: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = listings.length > limit;
  const page = hasMore ? listings.slice(0, limit) : listings;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return NextResponse.json({ listings: page, nextCursor });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 5 listings per day
  const rl = await rateLimit(
    `market:${session.user.id}`,
    LIMITS.MARKET_LISTING.limit,
    LIMITS.MARKET_LISTING.windowMs,
  );
  if (!rl.success) {
    return NextResponse.json(
      { error: "Listing limit reached — you can post up to 5 listings per day." },
      { status: 429 },
    );
  }

  const user = await db.userIdentity.findUnique({
    where: { id: session.user.id },
    select: { campusId: true, verificationStatus: true },
  });

  if (user?.verificationStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "Only verified users can post marketplace listings." },
      { status: 403 },
    );
  }
  if (!user.campusId) {
    return NextResponse.json({ error: "No campus assigned" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const listing = await db.campusMarketListing.create({
    data: {
      campusId: user.campusId,
      sellerId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      priceInr: parsed.data.priceInr,
      condition: parsed.data.condition,
    },
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json(listing, { status: 201 });
}
