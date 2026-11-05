/**
 * GET  /api/dev/posts?page=1&type=&visibility=&q=
 * POST /api/dev/posts
 * PATCH /api/dev/posts
 * DELETE /api/dev/posts?id=
 */
import { NextRequest, NextResponse } from "next/server";
import { devDb } from "@/lib/db";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;
  const type = searchParams.get("type") ?? undefined;
  const visibility = searchParams.get("visibility") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const where = {
    ...(type ? { type: type as "TEXT" | "IMAGE" | "LINK" | "POLL" } : {}),
    ...(visibility ? { visibility: visibility as "PUBLIC" | "CONNECTIONS" | "CAMPUS" } : {}),
    ...(q ? { body: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [posts, total] = await Promise.all([
    devDb.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { displayName: true, username: true, role: true } },
        _count: { select: { comments: true } },
      },
    }),
    devDb.post.count({ where }),
  ]);

  return NextResponse.json({ posts, total, page, limit });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;

  try {
    const post = await devDb.post.create({
      data: {
        authorId: body.authorId as string,
        body: (body.body as string | null) ?? null,
        type: (body.type as "TEXT" | "IMAGE" | "LINK" | "POLL") ?? "TEXT",
        visibility: (body.visibility as "PUBLIC" | "CONNECTIONS" | "CAMPUS") ?? "PUBLIC",
      },
    });
    return NextResponse.json({ post }, { status: 201 });
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
  if (body.body !== undefined) data.body = body.body || null;
  if (body.type !== undefined) data.type = body.type;
  if (body.visibility !== undefined) data.visibility = body.visibility;
  if (body.isPinned !== undefined) data.isPinned = Boolean(body.isPinned);
  if (body.isHidden !== undefined) data.isHidden = Boolean(body.isHidden);
  if (body.hiddenReason !== undefined) data.hiddenReason = body.hiddenReason || null;

  try {
    const post = await devDb.post.update({
      where: { id },
      data,
    });
    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: String(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await devDb.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Delete failed", detail: String(err) }, { status: 400 });
  }
}
