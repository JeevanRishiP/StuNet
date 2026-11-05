/**
 * GET  /api/dev/achievements?page=1&status=&category=
 * POST /api/dev/achievements
 * PATCH /api/dev/achievements
 * DELETE /api/dev/achievements?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const status = searchParams.get("status") ?? undefined;
  const category = searchParams.get("category") ?? undefined;

  const where = {
    ...(status ? { verificationStatus: status as "PENDING" | "VERIFIED" | "REJECTED" } : {}),
    ...(category
      ? {
          category: category as
            | "HACKATHON"
            | "COMPETITIVE_PROGRAMMING"
            | "OPEN_SOURCE"
            | "RESEARCH"
            | "CERTIFICATION"
            | "SPORTS"
            | "CULTURAL"
            | "ACADEMIC"
            | "OTHER",
        }
      : {}),
  };

  const [achievements, total] = await Promise.all([
    devDb.achievement.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { displayName: true, username: true } },
      },
    }),
    devDb.achievement.count({ where }),
  ]);

  return NextResponse.json({ achievements, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const achievement = await devDb.achievement.create({
      data: {
        userId: body.userId as string,
        title: body.title as string,
        description: (body.description as string | null) ?? null,
        category: body.category as
          | "HACKATHON"
          | "COMPETITIVE_PROGRAMMING"
          | "OPEN_SOURCE"
          | "RESEARCH"
          | "CERTIFICATION"
          | "SPORTS"
          | "CULTURAL"
          | "ACADEMIC"
          | "OTHER",
        scope: body.scope as "CAMPUS" | "INTER_COLLEGE" | "STATE" | "NATIONAL" | "INTERNATIONAL",
        proofUrl: (body.proofUrl as string | null) ?? null,
        achievedAt: body.achievedAt ? new Date(body.achievedAt as string) : new Date(),
        verificationStatus:
          (body.verificationStatus as "PENDING" | "VERIFIED" | "REJECTED") ?? "PENDING",
      },
    });
    return NextResponse.json({ achievement }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.category !== undefined) data.category = body.category;
  if (body.scope !== undefined) data.scope = body.scope;
  if (body.proofUrl !== undefined) data.proofUrl = body.proofUrl || null;
  if (body.verificationStatus !== undefined) {
    data.verificationStatus = body.verificationStatus;
    if (body.verificationStatus === "VERIFIED") {
      data.verifiedAt = new Date();
      data.verifiedById = "dev-console";
    }
  }
  if (body.rejectionReason !== undefined) data.rejectionReason = body.rejectionReason || null;
  if (body.externalScore !== undefined)
    data.externalScore = body.externalScore ? Number(body.externalScore) : null;

  try {
    const achievement = await devDb.achievement.update({
      where: { id },
      data,
    });
    return NextResponse.json({ achievement });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.achievement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
