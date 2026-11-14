import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { CreateCompanySchema } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;

  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const stage = url.searchParams.get("stage")?.trim();
  const sort = url.searchParams.get("sort") ?? "revenue"; // "revenue" | "recent" | "followers"
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);

  const whereClause: Record<string, unknown> = {};

  if (stage && stage !== "ALL") {
    whereClause.stage = stage;
  }

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tagline: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: Record<string, "asc" | "desc"> = { verifiedRevenue: "desc" };
  if (sort === "recent") {
    orderBy = { createdAt: "desc" };
  } else if (sort === "name") {
    orderBy = { name: "asc" };
  }

  const companies = await db.company.findMany({
    where: whereClause,
    orderBy: [orderBy, { createdAt: "desc" }],
    take: limit,
    include: {
      roles: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          followers: true,
          posts: true,
          opportunities: true,
        },
      },
      ...(viewerId
        ? {
            followers: {
              where: { userId: viewerId },
              select: { userId: true },
            },
          }
        : {}),
    },
  });

  const formatted = companies.map((c, index) => {
    const viewerFollow = viewerId && c.followers && c.followers.length > 0;
    const viewerRoleObj = viewerId ? c.roles.find((r) => r.userId === viewerId) : null;

    return {
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      logoUrl: c.logoUrl,
      websiteUrl: c.websiteUrl,
      linkedinUrl: c.linkedinUrl,
      stage: c.stage,
      verifiedRevenue: c.verifiedRevenue,
      revenueCurrency: c.revenueCurrency,
      isRevenueVerified: c.isRevenueVerified,
      verificationProofUrl: c.verificationProofUrl,
      hiringStatus: c.hiringStatus,
      createdAt: c.createdAt,
      rank: index + 1,
      followersCount: c._count.followers,
      postsCount: c._count.posts,
      opportunitiesCount: c._count.opportunities,
      members: c.roles.map((r) => ({
        userId: r.userId,
        name: r.user.displayName,
        username: r.user.username,
        avatarUrl: r.user.avatarUrl,
        ownerType: r.ownerType,
        position: r.position,
        showOnProfile: r.showOnProfile,
      })),
      viewerHasFollowed: Boolean(viewerFollow),
      viewerRole: viewerRoleObj?.ownerType ?? null,
      canPost: viewerRoleObj?.ownerType === "FOUNDER" || viewerRoleObj?.ownerType === "CO_FOUNDER",
      canManageTeam:
        viewerRoleObj?.ownerType === "FOUNDER" || viewerRoleObj?.ownerType === "CO_FOUNDER",
    };
  });

  return NextResponse.json({ items: formatted });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const {
    name,
    tagline,
    description,
    websiteUrl,
    linkedinUrl,
    logoUrl,
    stage,
    verifiedRevenue,
    revenueCurrency,
    verificationProofUrl,
    hiringStatus,
    position,
    showOnProfile,
  } = parsed.data;

  const normalizedName = name.toLowerCase().trim();

  // Check if company name is already registered
  const existing = await db.company.findUnique({
    where: { normalizedName },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A company or startup with this name is already registered." },
      { status: 409 },
    );
  }

  // Transaction to create company, assign founder role, and follow company
  const company = await db.$transaction(async (tx) => {
    const created = await tx.company.create({
      data: {
        name,
        normalizedName,
        tagline: tagline || null,
        description: description || null,
        logoUrl: logoUrl || null,
        websiteUrl: websiteUrl || null,
        linkedinUrl: linkedinUrl || null,
        stage: stage || "IDEA",
        verifiedRevenue: verifiedRevenue ?? 0,
        revenueCurrency: revenueCurrency || "INR",
        isRevenueVerified: Boolean(verifiedRevenue && verifiedRevenue > 0 && verificationProofUrl),
        verificationProofUrl: verificationProofUrl || null,
        hiringStatus: Boolean(hiringStatus),
        createdByUserId: userId,
      },
    });

    await tx.userCompanyRole.create({
      data: {
        userId,
        companyId: created.id,
        ownerType: "FOUNDER",
        position: position || "Founder",
        showOnProfile: showOnProfile ?? true,
      },
    });

    // Automatically follow by founder
    await tx.companyFollow.create({
      data: {
        userId,
        companyId: created.id,
      },
    });

    return created;
  });

  return NextResponse.json({ success: true, company }, { status: 201 });
}
