/**
 * apps/web/src/app/api/auth/signup/route.ts
 * Signup API route — validates input, calls signupStudent(), returns result.
 * Rate-limited: max 5 signups per IP per 15 minutes.
 */
import { NextRequest, NextResponse } from "next/server";
import { signupStudent } from "@/lib/signup";
import { SignupSchema } from "@stunet/types";
import { Redis } from "ioredis";

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6382", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_WINDOW_SECONDS = 15 * 60;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `ratelimit:signup:${ip}`;
  const attempts = await redis.incr(key);
  if (attempts === 1) await redis.expire(key, SIGNUP_WINDOW_SECONDS);

  if (attempts > SIGNUP_RATE_LIMIT) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  // Validate input — reject on failure, never sanitize-and-continue
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 422 },
    );
  }

  const result = await signupStudent(parsed.data);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ verificationStatus: result.verificationStatus }, { status: 201 });
}
