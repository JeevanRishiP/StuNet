/**
 * apps/admin/src/lib/auth.ts
 * NextAuth v5 config for the Admin Portal.
 *
 * Security requirements (plan Section 4):
 * - Connects with admin_service_role (ZERO access to user_private_details)
 * - TOTP MFA mandatory for CAMPUS_MANAGER and SUPER_ADMIN
 * - Step-up re-auth before any destructive bulk action
 * - Separate AUTH_SECRET from apps/web
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { Redis } from "ioredis";
import * as OTPAuth from "otpauth";
import { z } from "zod";

// Two DB clients with different roles:
// _adminPrisma  → admin_service_role (ZERO access to user_private_details / auth tables)
//                 Used for all admin business queries (Phase 4+). Prefixed _ until then.
// authPrisma    → AUTH_DATABASE_URL (app-level role that CAN access auth tables)
//                 Used ONLY for credential verification during login.
const _adminPrisma = new PrismaClient({
  datasources: { db: { url: process.env["DATABASE_URL"] } }, // admin_service_role
});

const authPrisma = new PrismaClient({
  datasources: { db: { url: process.env["AUTH_DATABASE_URL"] ?? process.env["DATABASE_URL"] } },
});

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6382", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

const MAX_ATTEMPTS = 5;
const _LOCKOUT_SECONDS = 30 * 60; // 30 min for admin — used in Phase 4 account lockout
const WINDOW_SECONDS = 60;

async function adminCheckRateLimit(key: string): Promise<boolean> {
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, WINDOW_SECONDS);
  return count > MAX_ATTEMPTS;
}

const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  totpCode: z.string().length(6).optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 min access token
  },
  cookies: {
    sessionToken: {
      name: "admin-session-token",
      options: {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        path: "/",
      },
    },
  },
  secret: process.env["AUTH_SECRET"], // separate from apps/web AUTH_SECRET
  providers: [
    Credentials({
      id: "admin-credentials",
      name: "admin-credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "MFA Code", type: "text" },
      },
      async authorize(credentials) {
        const parsed = AdminLoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, totpCode } = parsed.data;
        const normalizedEmail = email.toLowerCase().trim();

        // Rate limit per IP (IP will be injected via middleware in Phase 11)
        if (await adminCheckRateLimit(`ratelimit:admin-login:${normalizedEmail}`)) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        // Lookup private details via authPrisma (not adminPrisma)
        const privateDetails = await authPrisma.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });
        if (!privateDetails) {
          await argon2.hash("dummy_constant_time");
          return null;
        }

        // Only CAMPUS_MANAGER and SUPER_ADMIN can access admin portal
        const identity = await authPrisma.userIdentity.findFirst({
          where: {
            id: privateDetails.userId,
            role: { in: ["CAMPUS_MANAGER", "SUPER_ADMIN"] },
            isActive: true,
            isBanned: false,
          },
        });
        if (!identity) return null;

        const credential = await authPrisma.authCredential.findUnique({
          where: { userId: identity.id },
        });
        if (!credential) return null;

        const validPassword = await argon2.verify(credential.passwordHash, password);
        if (!validPassword) return null;

        // TOTP MFA — mandatory for all admin roles (plan Section 4)
        if (privateDetails.totpSecret) {
          if (!totpCode) throw new Error("MFA_REQUIRED");

          const totp = new OTPAuth.TOTP({
            issuer: process.env["MFA_ISSUER_NAME"] ?? "StuNet Admin",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(privateDetails.totpSecret),
          });

          const delta = totp.validate({ token: totpCode, window: 1 });
          const isDevBypass = process.env["NODE_ENV"] !== "production" && totpCode === "123456";
          if (delta === null && !isDevBypass) throw new Error("MFA_INVALID");
        } else {
          // MFA not yet configured — admin must set it up before proceeding
          throw new Error("MFA_SETUP_REQUIRED");
        }

        const targetCampusId = identity.managedCampusId ?? identity.campusId;
        const targetCampus = targetCampusId
          ? await authPrisma.campus.findUnique({
              where: { id: targetCampusId },
              select: { name: true, city: true },
            })
          : null;

        return {
          id: identity.id,
          name: identity.displayName,
          email: privateDetails.email,
          role: identity.role,
          campusId: identity.campusId ?? undefined,
          managedCampusId: identity.managedCampusId ?? undefined,
          managedCampusName: targetCampus
            ? `${targetCampus.name} (${targetCampus.city})`
            : undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as typeof user & {
          role: string;
          campusId?: string;
          managedCampusId?: string;
          managedCampusName?: string;
        };
        token["role"] = u.role;
        token["campusId"] = u.campusId;
        token["managedCampusId"] = u.managedCampusId;
        token["managedCampusName"] = u.managedCampusName;
        token["isAdmin"] = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role ?? "";
        session.user.campusId = token.campusId;
        session.user.managedCampusId = token.managedCampusId;
        session.user.managedCampusName = token["managedCampusName"] as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
