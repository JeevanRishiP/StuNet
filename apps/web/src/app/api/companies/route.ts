/**
 * /api/companies
 * GET  — list companies/initiatives
 * POST — create company/initiative & founder/co-founder role (Plan Delta v3)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CreateCompanySchema } from "@stunet/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.toLowerCase().trim();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  const companies = await db.company.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      roles: {
        where: { showOnProfile: true },
        include: {
          user: {
            select: { id: true, displayName: true, username: true, avatarUrl: true, role: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ items: companies });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const { name, description, websiteUrl, linkedinUrl, ownerType, position, showOnProfile } =
    parsed.data;
  const normalizedName = name.toLowerCase().trim();

  // Exact duplicate check
  const existing = await db.company.findUnique({
    where: { normalizedName },
  });

  if (existing) {
    // If company exists, associate role or return duplicate error
    const existingRole = await db.userCompanyRole.findUnique({
      where: {
        userId_companyId: {
          userId,
          companyId: existing.id,
        },
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "You are already registered with this company." },
        { status: 409 },
      );
    }

    const newRole = await db.userCompanyRole.create({
      data: {
        userId,
        companyId: existing.id,
        ownerType,
        position,
        showOnProfile,
      },
    });

    return NextResponse.json({ company: existing, role: newRole }, { status: 200 });
  }

  // Create brand new company and role
  const result = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name,
        normalizedName,
        description,
        websiteUrl: websiteUrl || null,
        linkedinUrl: linkedinUrl || null,
        createdByUserId: userId,
      },
    });

    const role = await tx.userCompanyRole.create({
      data: {
        userId,
        companyId: company.id,
        ownerType,
        position,
        showOnProfile,
      },
    });

    return { company, role };
  });

  return NextResponse.json(result, { status: 201 });
}
