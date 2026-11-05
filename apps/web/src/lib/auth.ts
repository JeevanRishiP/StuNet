/**
 * apps/web/src/lib/auth.ts
 * NextAuth v5 config for the Student Portal.
 *
 * Requirements:
 * - Google OAuth Authorization for students.
 * - Each student's email ID is fed / enrolled under a campus by their Campus Manager.
 * - If Google account matches an enrolled student, they log in as that verified Student.
 * - If Google account is NOT enrolled by any campus manager, they log in as a GUEST user.
 * - Usernames remain strictly unique.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { Redis } from "ioredis";
import { LoginSchema } from "@stunet/types";

const prisma = new PrismaClient();

// Redis for rate limiting
const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6382", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 minutes
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
    // Real Google OAuth Provider (activated when Google Cloud credentials are provided)
    ...(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
      ? [
          Google({
            clientId: process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
          }),
        ]
      : []),

    // Google Sign-In Provider (supporting both Live Google and Direct Simulated Google Sign-In)
    Credentials({
      id: "google-auth",
      name: "Google Account",
      credentials: {
        googleEmail: { label: "Google Email", type: "email" },
        googleName: { label: "Full Name", type: "text" },
        googleAvatar: { label: "Avatar", type: "text" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.googleEmail as string | undefined;
        if (!rawEmail) return null;
        const normalizedEmail = rawEmail.toLowerCase().trim();
        const googleName =
          (credentials?.googleName as string)?.trim() || normalizedEmail.split("@")[0];
        const googleAvatar = (credentials?.googleAvatar as string)?.trim() || null;

        // 1. Check if this Google email has been feeded / enrolled under any campus
        const privateDetails = await prisma.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });

        if (privateDetails) {
          const identity = await prisma.userIdentity.findUnique({
            where: { id: privateDetails.userId },
            include: { campus: true },
          });

          // If enrolled as student or club manager
          if (identity && identity.role !== "GUEST") {
            if (identity.isBanned) throw new Error("ACCOUNT_BANNED");

            if (googleAvatar && !identity.avatarUrl) {
              await prisma.userIdentity
                .update({
                  where: { id: identity.id },
                  data: { avatarUrl: googleAvatar, lastSeenAt: new Date() },
                })
                .catch(() => null);
            }

            return {
              id: identity.id,
              name: identity.displayName,
              username: identity.username,
              email: privateDetails.email,
              role: identity.role,
              campusId: identity.campusId ?? undefined,
              campusName: identity.campus?.name,
              verificationStatus: identity.verificationStatus,
              isGuest: false,
            };
          }
        }

        // 2. Email NOT enrolled by campus manager → Log in as GUEST user
        let guestUser = null;
        if (privateDetails) {
          guestUser = await prisma.userIdentity.findUnique({
            where: { id: privateDetails.userId },
          });
        }

        if (!guestUser) {
          const safePrefix =
            normalizedEmail
              .split("@")[0]
              ?.replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 15) || "guest";
          const guestUsername = `guest_${safePrefix}_${Math.floor(1000 + Math.random() * 9000)}`;

          guestUser = await prisma.userIdentity.create({
            data: {
              displayName: googleName,
              username: guestUsername,
              role: "GUEST",
              verificationStatus: "PENDING",
              campusId: null,
              avatarUrl: googleAvatar,
              headline: "Guest User · Pending Campus Whitelist",
              isActive: true,
              isBanned: false,
            },
          });

          await prisma.userPrivateDetails.create({
            data: {
              userId: guestUser.id,
              email: normalizedEmail,
            },
          });
        }

        return {
          id: guestUser.id,
          name: guestUser.displayName,
          username: guestUser.username,
          email: normalizedEmail,
          role: "GUEST",
          campusId: undefined,
          campusName: undefined,
          verificationStatus: "PENDING",
          isGuest: true,
        };
      },
    }),

    // Fallback password credentials provider
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();
        const ipKey = `ratelimit:login:ip:unknown`;
        const { blocked: ipBlocked } = await checkRateLimit(ipKey);
        if (ipBlocked) throw new Error("TOO_MANY_ATTEMPTS");

        const privateDetails = await prisma.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });
        if (!privateDetails) {
          await argon2.hash("dummy_password_to_prevent_timing_attack");
          return null;
        }

        const identity = await prisma.userIdentity.findFirst({
          where: { id: privateDetails.userId },
          include: { campus: true },
        });
        if (!identity) return null;

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

        await redis.del(`ratelimit:login:account:${identity.id}`);

        if (identity.isBanned) throw new Error("ACCOUNT_BANNED");

        return {
          id: identity.id,
          name: identity.displayName,
          username: identity.username,
          email: privateDetails.email,
          role: identity.role,
          campusId: identity.campusId ?? undefined,
          campusName: identity.campus?.name,
          verificationStatus: identity.verificationStatus,
          isGuest: identity.role === "GUEST",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // If authenticating via official OAuth Google provider
      if (account?.provider === "google" && user.email) {
        const normalizedEmail = user.email.toLowerCase().trim();
        const privateDetails = await prisma.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });

        if (privateDetails) {
          const identity = await prisma.userIdentity.findUnique({
            where: { id: privateDetails.userId },
            include: { campus: true },
          });

          if (identity && identity.role !== "GUEST") {
            user.id = identity.id;
            user.name = identity.displayName;
            const u = user as unknown as Record<string, unknown>;
            u["username"] = identity.username;
            u["role"] = identity.role;
            u["campusId"] = identity.campusId ?? undefined;
            u["campusName"] = identity.campus?.name;
            u["verificationStatus"] = identity.verificationStatus;
            u["isGuest"] = false;
            return true;
          }
        }

        // Email not enrolled -> Guest User
        let guestUser = null;
        if (privateDetails) {
          guestUser = await prisma.userIdentity.findUnique({
            where: { id: privateDetails.userId },
          });
        }

        if (!guestUser) {
          const safePrefix =
            normalizedEmail
              .split("@")[0]
              ?.replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 15) || "guest";
          const guestUsername = `guest_${safePrefix}_${Math.floor(1000 + Math.random() * 9000)}`;

          guestUser = await prisma.userIdentity.create({
            data: {
              displayName: user.name || normalizedEmail.split("@")[0],
              username: guestUsername,
              role: "GUEST",
              verificationStatus: "PENDING",
              campusId: null,
              avatarUrl: user.image ?? null,
              isActive: true,
              isBanned: false,
            },
          });

          await prisma.userPrivateDetails.create({
            data: { userId: guestUser.id, email: normalizedEmail },
          });
        }

        user.id = guestUser.id;
        user.name = guestUser.displayName;
        const u = user as unknown as Record<string, unknown>;
        u["username"] = guestUser.username;
        u["role"] = "GUEST";
        u["campusId"] = undefined;
        u["verificationStatus"] = "PENDING";
        u["isGuest"] = true;
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          role: string;
          username?: string;
          campusId?: string;
          campusName?: string;
          verificationStatus: string;
          isGuest?: boolean;
        };
        token["role"] = u.role;
        token["username"] = u.username;
        token["campusId"] = u.campusId;
        token["campusName"] = u.campusName;
        token["verificationStatus"] = u.verificationStatus;
        token["isGuest"] = u.isGuest ?? u.role === "GUEST";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token["role"] as string) ?? "GUEST";
        session.user.username = token["username"] as string | undefined;
        session.user.campusId = token["campusId"] as string | undefined;
        session.user.campusName = token["campusName"] as string | undefined;
        session.user.verificationStatus = (token["verificationStatus"] as string) ?? "";
        session.user.isGuest = Boolean(token["isGuest"] ?? session.user.role === "GUEST");
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
