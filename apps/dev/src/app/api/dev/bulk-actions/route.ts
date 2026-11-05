/**
 * GET    /api/dev/bulk-actions?page=1&type=
 * POST   /api/dev/bulk-actions
 * PATCH  /api/dev/bulk-actions
 * DELETE /api/dev/bulk-actions?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";
import type { BulkActionType, Prisma } from "@prisma/client";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const type = searchParams.get("type") ?? undefined;

  const where = {
    ...(type ? { type: type as BulkActionType } : {}),
  };

  const [actions, total] = await Promise.all([
    devDb.pendingBulkAction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    devDb.pendingBulkAction.count({ where }),
  ]);

  // Enrich initiator
  const initiatorIds = [...new Set(actions.map((a) => a.initiatedById))];
  const initiators = await devDb.userIdentity.findMany({
    where: { id: { in: initiatorIds } },
    select: { id: true, username: true, displayName: true },
  });
  const userMap = new Map(initiators.map((u) => [u.id, u]));

  const enriched = actions.map((a) => ({
    ...a,
    initiator: userMap.get(a.initiatedById) ?? null,
  }));

  return NextResponse.json({ actions: enriched, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const revertMinutes = Number(body.revertMinutes ?? 60);
    const revertableUntil = new Date(Date.now() + revertMinutes * 60 * 1000);

    let parsedPayload: Prisma.InputJsonValue = {};
    if (typeof body.payload === "string") {
      try {
        parsedPayload = JSON.parse(body.payload) as Prisma.InputJsonValue;
      } catch {
        parsedPayload = { raw: body.payload };
      }
    } else if (body.payload && typeof body.payload === "object") {
      parsedPayload = body.payload as Prisma.InputJsonValue;
    }

    const action = await devDb.pendingBulkAction.create({
      data: {
        initiatedById: (body.initiatedById as string) || "dev-console",
        type: (body.type as BulkActionType) || "BULK_REMOVE_POSTS",
        payload: parsedPayload,
        confirmationText: (body.confirmationText as string) || "CONFIRM_DEV_BULK_ACTION",
        revertableUntil,
        executedAt: body.executeImmediately ? new Date() : null,
      },
    });

    return NextResponse.json({ action }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Create failed", detail: String(err) }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const { id, action } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    if (action === "revert") {
      const updated = await devDb.pendingBulkAction.update({
        where: { id: id as string },
        data: {
          revertedAt: new Date(),
          revertedById: "dev-console",
        },
      });
      return NextResponse.json({ action: updated });
    }

    if (action === "execute") {
      const updated = await devDb.pendingBulkAction.update({
        where: { id: id as string },
        data: {
          executedAt: new Date(),
        },
      });
      return NextResponse.json({ action: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Action failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.pendingBulkAction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
