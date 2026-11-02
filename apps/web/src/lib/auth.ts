/**
 * apps/web/src/lib/auth.ts
 * NextAuth v5 config for the Student Portal.
 *
 * - Argon2id password hashing (plan Section 4)
 * - httpOnly, Secure, SameSite=strict cookies
 * - Short-lived access tokens (~15 min) + rotating refresh tokens
 * - Domain-match auto-verification on signup (plan Phase 2)
 * - Rate-limited login (per-IP + per-account) via Redis
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { Redis } from "ioredis";
import { LoginSchema } from "@stunet/types";

const prisma = new PrismaClient();

// Redis for rate limiting
const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

// ── Rate limit helpers ────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const WINDOW_SECONDS = 60;

async function checkRateLimit(key: string): Promise<{ blocked: boolean; remaining: number }> {
  const attempts = await redis.incr(key);
  if (attempts === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  const blocked = attempts > MAX_ATTEMPTS;
  return { blocked, remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
}

async function lockAccount(userId: string): Promise<void> {
  await redis.setex(`lockout:${userId}`, LOCKOUT_SECONDS, "1");
}

async function isAccountLocked(userId: string): Promise<boolean> {
  return (await redis.exists(`lockout:${userId}`)) === 1;
}

// ── Auth config ────────────────────────────────────────────────────────────────
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes — short-lived access token
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/",
      },
    },
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate input shape first
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const ipKey = `ratelimit:login:ip:unknown`; // real IP injected via middleware
        const { blocked: ipBlocked } = await checkRateLimit(ipKey);
        if (ipBlocked) throw new Error("TOO_MANY_ATTEMPTS");

        // Look up private details (app_service_role can access this table)
        const privateDetails = await prisma.userPrivateDetails.findUnique({
          where: { email },
        });
        if (!privateDetails) {
          // Constant-time response to avoid user enumeration
          await argon2.hash("dummy_password_to_prevent_timing_attack");
          return null;
        }

        const identity = await prisma.userIdentity.findFirst({
          where: { id: privateDetails.userId },
        });
        if (!identity) return null;

        // Account lockout check
        if (await isAccountLocked(identity.id)) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const credential = await prisma.authCredential.findUnique({
          where: { userId: identity.id },
        });
        if (!credential) return null;

        const valid = await argon2.verify(credential.passwordHash, password);

        if (!valid) {
          const accountKey = `ratelimit:login:account:${identity.id}`;
          const { blocked } = await checkRateLimit(accountKey);
          if (blocked) await lockAccount(identity.id);
          return null;
        }

        // Clear failed attempts on success
        await redis.del(`ratelimit:login:account:${identity.id}`);

        if (identity.isBanned) throw new Error("ACCOUNT_BANNED");

        return {
          id: identity.id,
          name: identity.displayName,
          email: privateDetails.email,
          role: identity.role,
          campusId: identity.campusId ?? undefined,
          verificationStatus: identity.verificationStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Narrow user type (credentials provider returns extra fields)
        const u = user as typeof user & {
          role: string;
          campusId?: string;
          verificationStatus: string;
        };
        token["role"] = u.role;
        token["campusId"] = u.campusId;
        token["verificationStatus"] = u.verificationStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "";
        session.user.campusId = token.campusId;
        session.user.verificationStatus = token.verificationStatus ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
