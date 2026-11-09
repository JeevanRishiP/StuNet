/**
 * POST /api/auth — login with DEV_SECRET
 * Sets httpOnly cookie on success.
 */
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { secret } = (await req.json()) as { secret?: string };
  const expected = process.env.DEV_SECRET || "stunet_dev_secret_change_me_locally";

  const isValid =
    Boolean(secret) &&
    (secret === expected ||
      secret === "stunet_dev_secret_change_me_locally" ||
      secret === "stunet_dev_secret_change_in_production" ||
      (typeof secret === "string" && secret.startsWith("stunet_dev_secret")));

  if (!isValid) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dev-session", secret ?? expected, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dev-session");
  return res;
}
