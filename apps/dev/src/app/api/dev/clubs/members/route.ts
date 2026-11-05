/**
 * GET  /api/dev/clubs/members?clubId=
 * POST /api/dev/clubs/members — add member
 * PATCH /api/dev/clubs/members — change role / deactivate
 * DELETE /api/dev/clubs/members?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const clubId = req.nextUrl.searchParams.get("clubId");
  if (!clubId) return NextResponse.json({ error: "clubId required" }, { status: 400 });

  const members = await devDb.clubMember.findMany({
    where: { clubId },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { displayName: true, username: true, avatarUrl: true } } },
  });

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as { clubId: string; userId: string; role?: string };

  try {
    const member = await devDb.clubMember.create({
      data: {
        clubId: body.clubId,
        userId: body.userId,
        role:
          (body.role as
            | "MEMBER"
            | "PRESIDENT"
            | "VICE_PRESIDENT"
            | "OPERATIONAL_HEAD"
            | "OUTREACH_HEAD"
            | "FINANCE_HEAD"
            | "CREATIVE_DESIGN_HEAD"
            | "SOCIAL_MEDIA_HEAD"
            | "MANAGER") ?? "MEMBER",
        isActive: true,
      },
    });
    return NextResponse.json({ member }, { status: 201 });
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
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  try {
    const member = await devDb.clubMember.update({
      where: { id },
      data,
    });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.clubMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
