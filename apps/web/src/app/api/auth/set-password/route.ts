/**
 * apps/web/src/app/api/auth/set-password/route.ts
 * Endpoint for setting password on first login (or resetting password from an authenticated session).
 *
 * Security:
 * - Requires authenticated session (Google OAuth or active session).
 * - Hashes password using Argon2id.
 * - Stores hash strictly in `user_credentials` (and syncs to `auth_credentials`).
 * - Never returns password hash in responses.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import crypto from "crypto";
import { verifyTurnstileToken } from "@/lib/turnstile";

const prisma = new PrismaClient();

async function isPasswordBreached(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: controller.signal,
      headers: { "Add-Padding": "true", "User-Agent": "StuNet-Security-Check" },
    });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const text = await res.text();
    return text.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch (err) {
    // Fail open on network timeouts or offline test environments
    console.warn("[Security] HIBP breached password check skipped (offline or timeout):", err);
    return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Guest users cannot set local credentials
  if (session.user.role === "GUEST" || session.user.isGuest) {
    return NextResponse.json(
      {
        error:
          "Guest accounts cannot set passwords. Please sign in with an institutional Google account.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { password, confirmPassword, turnstileToken } =
    (body as { password?: string; confirmPassword?: string; turnstileToken?: string }) || {};

  // Cloudflare Turnstile CAPTCHA verification
  const turnstileCheck = await verifyTurnstileToken(turnstileToken);
  if (!turnstileCheck.success) {
    return NextResponse.json(
      { error: "CAPTCHA verification required. Please complete the security challenge." },
      { status: 400 },
    );
  }

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long" },
      { status: 400 },
    );
  }

  if (password.length > 128) {
    return NextResponse.json(
      { error: "Password exceeds maximum permitted length (128 characters)" },
      { status: 400 },
    );
  }

  if (confirmPassword && password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  // Check for breached password via HaveIBeenPwned k-anonymity API
  const breached = await isPasswordBreached(password);
  if (breached) {
    return NextResponse.json(
      {
        error:
          "This password has appeared in a known public data breach. To protect your student account, please choose a different password.",
      },
      { status: 400 },
    );
  }

  // Hash password using Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  const now = new Date();

  // Atomically update user_credentials and legacy auth_credentials
  await prisma.$transaction(async (tx) => {
    await tx.userCredentials.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        passwordHash,
        passwordSetAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      update: {
        passwordHash,
        passwordSetAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Sync to auth_credentials for compatibility
    await tx.authCredential.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
      update: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: "Password set successfully.",
  });
}
