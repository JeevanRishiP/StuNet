/**
 * POST /api/dev/impersonate — store impersonation userId in cookie
 * DELETE /api/dev/impersonate — clear it
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") return NextResponse.json({}, { status: 404 });

  const { userId } = (await req.json()) as { userId: string };
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dev-impersonate-user-id", userId, {
    httpOnly: false, // needs to be readable by the portals
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4h
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dev-impersonate-user-id");
  return res;
}
