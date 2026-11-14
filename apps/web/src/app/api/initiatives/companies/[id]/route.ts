import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireNonGuestUser } from "@/lib/post-access";
import { z } from "zod";

const UpdateCompanySchema = z.object({
  name: z.string().min(2).max(200).trim().optional(),
  tagline: z.string().max(300).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  websiteUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  linkedinUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  logoUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  stage: z.string().max(50).optional(),
  verifiedRevenue: z.number().min(0).optional(),
  revenueCurrency: z.string().max(10).optional(),
  verificationProofUrl: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  hiringStatus: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const viewerId = session?.user?.id;
  const companyId = params.id;

  const company = await db.company.findUnique({
    where: { id: companyId },
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
      opportunities: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      },
      posts: {
        where: { deletedAt: null, isHidden: false },
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
          _count: { select: { comments: true } },
          ...(viewerId
            ? {
                postLikes: {
                  where: { userId: viewerId },
                  select: { userId: true },
                },
              }
            : {}),
        },
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

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const viewerFollow = viewerId && company.followers && company.followers.length > 0;
  const viewerRoleObj = viewerId ? company.roles.find((r) => r.userId === viewerId) : null;

  return NextResponse.json({
    company: {
      ...company,
      followersCount: company._count.followers,
      postsCount: company._count.posts,
      opportunitiesCount: company._count.opportunities,
      viewerHasFollowed: Boolean(viewerFollow),
      viewerRole: viewerRoleObj?.ownerType ?? null,
      canPost: viewerRoleObj?.ownerType === "FOUNDER" || viewerRoleObj?.ownerType === "CO_FOUNDER",
      canManageTeam:
        viewerRoleObj?.ownerType === "FOUNDER" || viewerRoleObj?.ownerType === "CO_FOUNDER",
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await auth();
  const actorCheck = await requireNonGuestUser(session);
  if (!actorCheck.ok) {
    return NextResponse.json({ error: actorCheck.error }, { status: actorCheck.status });
  }

  const userId = actorCheck.user.id;
  const companyId = params.id;

  // Verify caller is FOUNDER or CO_FOUNDER
  const role = await db.userCompanyRole.findUnique({
    where: {
      userId_companyId: {
        userId,
        companyId,
      },
    },
  });

  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  if ((!role || (role.ownerType !== "FOUNDER" && role.ownerType !== "CO_FOUNDER")) && !isAdmin) {
    return NextResponse.json(
      { error: "Only founders and co-founders can edit company information." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const dataToUpdate: Record<string, unknown> = {};
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
  } = parsed.data;

  if (name !== undefined) {
    dataToUpdate.name = name;
    dataToUpdate.normalizedName = name.toLowerCase().trim();
  }
  if (tagline !== undefined) dataToUpdate.tagline = tagline || null;
  if (description !== undefined) dataToUpdate.description = description || null;
  if (websiteUrl !== undefined) dataToUpdate.websiteUrl = websiteUrl || null;
  if (linkedinUrl !== undefined) dataToUpdate.linkedinUrl = linkedinUrl || null;
  if (logoUrl !== undefined) dataToUpdate.logoUrl = logoUrl || null;
  if (stage !== undefined) dataToUpdate.stage = stage;
  if (verifiedRevenue !== undefined) {
    dataToUpdate.verifiedRevenue = verifiedRevenue;
    if (verificationProofUrl) {
      dataToUpdate.isRevenueVerified = true;
      dataToUpdate.verificationProofUrl = verificationProofUrl;
    }
  }
  if (revenueCurrency !== undefined) dataToUpdate.revenueCurrency = revenueCurrency;
  if (verificationProofUrl !== undefined)
    dataToUpdate.verificationProofUrl = verificationProofUrl || null;
  if (hiringStatus !== undefined) dataToUpdate.hiringStatus = hiringStatus;

  const updated = await db.company.update({
    where: { id: companyId },
    data: dataToUpdate,
  });

  return NextResponse.json({ success: true, company: updated });
}
