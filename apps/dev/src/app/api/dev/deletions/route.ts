/**
 * GET    /api/dev/deletions?page=1&status=
 * POST   /api/dev/deletions
 * PATCH  /api/dev/deletions
 * DELETE /api/dev/deletions?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";
import type { DeletionRequestStatus } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const status = searchParams.get("status") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;

  const where = {
    ...(status ? { status: status as DeletionRequestStatus } : {}),
    ...(userId ? { userId } : {}),
  };

  const [requests, total] = await Promise.all([
    devDb.dataDeletionRequest.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { requestedAt: "desc" },
    }),
    devDb.dataDeletionRequest.count({ where }),
  ]);

  // Enrich with user info where available
  const userIds = [...new Set(requests.map((r) => r.userId))];
  const users = await devDb.userIdentity.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = requests.map((r) => ({
    ...r,
    user: userMap.get(r.userId) ?? null,
  }));

  return NextResponse.json({ requests: enriched, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const request = await devDb.dataDeletionRequest.create({
      data: {
        userId: body.userId as string,
        status: (body.status as DeletionRequestStatus) ?? "PENDING",
        notes: (body.notes as string | null) ?? null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt as string) : null,
      },
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const { id, status, notes, scheduledAt, completedAt } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const request = await devDb.dataDeletionRequest.update({
      where: { id: id as string },
      data: {
        ...(status ? { status: status as DeletionRequestStatus } : {}),
        ...(notes !== undefined ? { notes: notes as string | null } : {}),
        ...(scheduledAt !== undefined
          ? { scheduledAt: scheduledAt ? new Date(scheduledAt as string) : null }
          : {}),
        ...(completedAt !== undefined
          ? { completedAt: completedAt ? new Date(completedAt as string) : null }
          : {}),
        reviewedById: "dev-console",
      },
    });
    return NextResponse.json({ request });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.dataDeletionRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
