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

const prisma = new PrismaClient();

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

  const { password, confirmPassword } =
    (body as { password?: string; confirmPassword?: string }) || {};

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
