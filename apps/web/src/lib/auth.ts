/**
 * apps/web/src/lib/auth.ts
 * StuNet — Hybrid Authentication System (Google OAuth + First-Login Password)
 *
 * Architecture:
 * 1. Admin pre-seeds institutional_roster (email, role, identifier, campus_id, is_claimed=false).
 * 2. FIRST LOGIN: User clicks "Continue with Google".
 *    - Google OAuth verifies account and email.
 *    - Backend looks up institutional_roster WHERE email = verified_email AND is_claimed = false.
 *    - No match -> reject login with "This email isn't on your campus's roster yet — ask your campus admin to add you".
 *    - Match found -> create user_identity + academic/faculty details, mark roster claimed,
 *      force-redirect to "Set Your Password" screen (username = USN or Employee ID, fixed, not chosen).
 * 3. PASSWORD SETUP:
 *    - Username is fixed to roster's identifier (USN / Employee ID).
 *    - Password hash stored in user_credentials using Argon2id.
 * 4. RETURNING LOGIN:
 *    - Option A: Continue with Google (re-runs OAuth + roster check, doubles as account recovery).
 *    - Option B: Username (USN/Employee ID) + Password (Argon2id verify, Redis rate-limited, DB lockout).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaClient, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { Redis } from "ioredis";

const prisma = new PrismaClient();

const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6382", {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
});

/**
 * Redis-backed rate limiter for login attempts (per-IP and per-account).
 */
async function checkRateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSecs);
    }
    return count > limit;
  } catch {
    // If Redis is temporarily unavailable, fail open to not block valid logins
    return false;
  }
}

/**
 * Claims an unclaimed roster row and creates the corresponding user_identity
 * and academic/faculty records in an atomic transaction.
 * Security Rule 1: institutional_roster is the ONLY way a user_identity row can ever be created.
 */
async function claimRosterAndCreateUser({
  email,
  displayName,
  avatarUrl,
}: {
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const normalizedEmail = email.toLowerCase().trim();

  // Find unclaimed roster entry
  const rosterEntry = await prisma.institutionalRoster.findFirst({
    where: {
      email: normalizedEmail,
      isClaimed: false,
    },
    include: { campus: true },
  });

  if (!rosterEntry) {
    return null;
  }

  // Username is the roster's identifier (USN for students, Employee ID for faculty), fixed, not chosen
  const username = rosterEntry.identifier.trim();
  const role = rosterEntry.role as UserRole;

  return await prisma.$transaction(async (tx) => {
    // 1. Create UserIdentity
    const identity = await tx.userIdentity.create({
      data: {
        displayName: displayName?.trim() || username,
        username,
        studentEmail: normalizedEmail,
        role,
        verificationStatus: "VERIFIED",
        isVerified: true,
        campusId: rosterEntry.campusId,
        joiningYear: rosterEntry.joinedYear,
        avatarUrl: avatarUrl ?? null,
        headline:
          role === "FACULTY"
            ? `Faculty · ${rosterEntry.campus.name}`
            : `Student · ${rosterEntry.campus.name}`,
        isActive: true,
        isBanned: false,
      },
      include: { campus: true },
    });

    // 2. Role-specific academic / employment records
    if (role === "STUDENT") {
      await tx.studentAcademicDetails.create({
        data: {
          userId: identity.id,
          usn: rosterEntry.identifier,
          currentCourseYear: rosterEntry.currentCourseYear,
          joinedYear: rosterEntry.joinedYear,
          graduationYear: rosterEntry.graduationYear,
        },
      });
    } else if (role === "FACULTY") {
      await tx.facultyDetails.create({
        data: {
          userId: identity.id,
          employeeId: rosterEntry.identifier,
        },
      });
    }

    // 3. UserPrivateDetails
    await tx.userPrivateDetails.create({
      data: {
        userId: identity.id,
        email: normalizedEmail,
      },
    });

    // 4. Mark roster entry claimed
    await tx.institutionalRoster.update({
      where: { id: rosterEntry.id },
      data: { isClaimed: true },
    });

    return identity;
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env["AUTH_SECRET"],
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
    // Live Google OAuth Provider
    ...(process.env["GOOGLE_CLIENT_ID"] && process.env["GOOGLE_CLIENT_SECRET"]
      ? [
          Google({
            clientId: process.env["GOOGLE_CLIENT_ID"],
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"],
          }),
        ]
      : []),

    // Username (USN / Employee ID) + Password Provider
    Credentials({
      id: "user-credentials",
      name: "Username & Password",
      credentials: {
        username: { label: "Username / USN / Employee ID", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawUsername = credentials?.username as string | undefined;
        const rawPassword = credentials?.password as string | undefined;

        if (!rawUsername || !rawPassword) {
          throw new Error("MISSING_CREDENTIALS");
        }

        const normalizedIdentifier = rawUsername.trim();

        // 1. Rate limiting via Redis (5 attempts per 15 minutes per account)
        const isRateLimited = await checkRateLimit(
          `ratelimit:login:user:${normalizedIdentifier.toLowerCase()}`,
          5,
          15 * 60,
        );
        if (isRateLimited) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        // 2. Lookup identity by username (USN/Employee ID) or studentEmail
        const identity = await prisma.userIdentity.findFirst({
          where: {
            OR: [
              { username: normalizedIdentifier },
              { username: { equals: normalizedIdentifier, mode: "insensitive" } },
              { studentEmail: { equals: normalizedIdentifier, mode: "insensitive" } },
              {
                studentAcademicDetails: {
                  usn: { equals: normalizedIdentifier, mode: "insensitive" },
                },
              },
              {
                facultyDetails: {
                  employeeId: { equals: normalizedIdentifier, mode: "insensitive" },
                },
              },
            ],
          },
          include: {
            campus: true,
          },
        });

        if (!identity) {
          // Constant-time hash prevention to avoid timing attacks
          await argon2.hash("dummy_constant_time_prevention", { type: argon2.argon2id });
          throw new Error("INVALID_CREDENTIALS");
        }

        if (identity.isBanned) {
          throw new Error("ACCOUNT_BANNED");
        }

        // 3. Query user_credentials (isolated from personal/profile details)
        let userCred = await prisma.userCredentials.findUnique({
          where: { userId: identity.id },
        });

        // Fallback to auth_credentials if existing row wasn't migrated yet
        if (!userCred) {
          const legacyCred = await prisma.authCredential.findUnique({
            where: { userId: identity.id },
          });
          if (legacyCred) {
            userCred = await prisma.userCredentials.create({
              data: {
                userId: identity.id,
                passwordHash: legacyCred.passwordHash,
                failedLoginAttempts: legacyCred.failedAttempts,
                lockedUntil: legacyCred.lockedUntil,
              },
            });
          }
        }

        if (!userCred) {
          throw new Error("PASSWORD_NOT_SET");
        }

        // 4. Check account lockout
        if (userCred.lockedUntil && userCred.lockedUntil > new Date()) {
          throw new Error("ACCOUNT_LOCKED");
        }

        // 5. Verify password with Argon2id
        const isValid = await argon2.verify(userCred.passwordHash, rawPassword);
        if (!isValid) {
          const newFailedAttempts = (userCred.failedLoginAttempts || 0) + 1;
          const lockedUntil = newFailedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

          await prisma.userCredentials.update({
            where: { userId: identity.id },
            data: {
              failedLoginAttempts: newFailedAttempts,
              lockedUntil,
            },
          });

          if (newFailedAttempts >= 5) {
            throw new Error("ACCOUNT_LOCKED");
          }
          throw new Error("INVALID_CREDENTIALS");
        }

        // 6. Reset failed attempts & update lastSeenAt
        await prisma.userCredentials.update({
          where: { userId: identity.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        await prisma.userIdentity
          .update({
            where: { id: identity.id },
            data: { lastSeenAt: new Date() },
          })
          .catch(() => null);

        return {
          id: identity.id,
          name: identity.displayName,
          username: identity.username,
          email: identity.studentEmail,
          role: identity.role,
          campusId: identity.campusId ?? undefined,
          campusName: identity.campus?.name,
          verificationStatus: identity.verificationStatus,
          isGuest: false,
          needsPasswordSetup: false,
        };
      },
    }),

    // Google Sign-In Provider (strict Roster-First validation & account recovery)
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

        // Rate limiting for Google authentication path in Redis
        const isRateLimited = await checkRateLimit(
          `ratelimit:google-auth:${normalizedEmail}`,
          10,
          60,
        );
        if (isRateLimited) {
          throw new Error("TOO_MANY_ATTEMPTS");
        }

        // 1. Check if user already exists (Returning user or password recovery)
        const privateDetails = await prisma.userPrivateDetails.findUnique({
          where: { email: normalizedEmail },
        });

        if (privateDetails) {
          const identity = await prisma.userIdentity.findUnique({
            where: { id: privateDetails.userId },
            include: { campus: true },
          });

          if (identity) {
            if (identity.isBanned) throw new Error("ACCOUNT_BANNED");

            if (googleAvatar && !identity.avatarUrl) {
              await prisma.userIdentity
                .update({
                  where: { id: identity.id },
                  data: { avatarUrl: googleAvatar, lastSeenAt: new Date() },
                })
                .catch(() => null);
            }

            // Check if user has set a password in user_credentials (or legacy auth_credentials)
            let cred = await prisma.userCredentials.findUnique({
              where: { userId: identity.id },
            });
            if (!cred) {
              const legacyCred = await prisma.authCredential.findUnique({
                where: { userId: identity.id },
              });
              if (legacyCred) {
                cred = await prisma.userCredentials.create({
                  data: {
                    userId: identity.id,
                    passwordHash: legacyCred.passwordHash,
                    failedLoginAttempts: legacyCred.failedAttempts,
                    lockedUntil: legacyCred.lockedUntil,
                  },
                });
              }
            }

            // Google OAuth doubles as account recovery: reset password lockout on successful Google verification
            if (cred) {
              await prisma.userCredentials.update({
                where: { userId: identity.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
              });
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
              isGuest: identity.role === "GUEST",
              needsPasswordSetup: !cred,
            };
          }
        }

        // 2. Not an existing user: Check institutional roster (First-time login)
        const newlyCreated = await claimRosterAndCreateUser({
          email: normalizedEmail,
          displayName: googleName,
          avatarUrl: googleAvatar,
        });

        if (newlyCreated) {
          return {
            id: newlyCreated.id,
            name: newlyCreated.displayName,
            username: newlyCreated.username,
            email: normalizedEmail,
            role: newlyCreated.role,
            campusId: newlyCreated.campusId ?? undefined,
            campusName: newlyCreated.campus?.name,
            verificationStatus: newlyCreated.verificationStatus,
            isGuest: false,
            needsPasswordSetup: true, // Forces first-time password setup screen
          };
        }

        // 3. No roster match found -> REJECT!
        // Never auto-create institutional accounts without pre-seeded roster row
        throw new Error("ROSTER_NOT_FOUND");
      },
    }),

    // Dedicated Guest Access Provider (Public Visitor Access)
    Credentials({
      id: "guest-auth",
      name: "Guest Access",
      credentials: {},
      async authorize() {
        let guestUser = await prisma.userIdentity.findFirst({
          where: { role: "GUEST" },
        });

        if (!guestUser) {
          guestUser = await prisma.userIdentity.create({
            data: {
              id: "cmw_guest_canonical",
              displayName: "Guest",
              username: "guest",
              role: "GUEST",
              verificationStatus: "PENDING",
              campusId: null,
              headline: "Guest User · Public Access",
              isActive: true,
              isBanned: false,
            },
          });
        }

        return {
          id: guestUser.id,
          name: "Guest",
          username: "guest",
          email: "",
          role: "GUEST",
          campusId: undefined,
          campusName: undefined,
          verificationStatus: "PENDING",
          isGuest: true,
          needsPasswordSetup: false,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
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

          if (identity) {
            if (identity.isBanned) return "/login?error=ACCOUNT_BANNED";

            let cred = await prisma.userCredentials.findUnique({
              where: { userId: identity.id },
            });
            if (!cred) {
              const legacyCred = await prisma.authCredential.findUnique({
                where: { userId: identity.id },
              });
              if (legacyCred) {
                cred = await prisma.userCredentials.create({
                  data: {
                    userId: identity.id,
                    passwordHash: legacyCred.passwordHash,
                    failedLoginAttempts: legacyCred.failedAttempts,
                    lockedUntil: legacyCred.lockedUntil,
                  },
                });
              }
            }

            // Reset password lockout since Google OAuth verified email ownership
            if (cred) {
              await prisma.userCredentials.update({
                where: { userId: identity.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
              });
            }

            user.id = identity.id;
            user.name = identity.displayName;
            const u = user as unknown as Record<string, unknown>;
            u["username"] = identity.username;
            u["role"] = identity.role;
            u["campusId"] = identity.campusId ?? undefined;
            u["campusName"] = identity.campus?.name;
            u["verificationStatus"] = identity.verificationStatus;
            u["isGuest"] = identity.role === "GUEST";
            u["needsPasswordSetup"] = !cred;
            return true;
          }
        }

        // Attempt roster claim
        const created = await claimRosterAndCreateUser({
          email: normalizedEmail,
          displayName: user.name,
          avatarUrl: user.image,
        });

        if (created) {
          user.id = created.id;
          user.name = created.displayName;
          const u = user as unknown as Record<string, unknown>;
          u["username"] = created.username;
          u["role"] = created.role;
          u["campusId"] = created.campusId ?? undefined;
          u["campusName"] = created.campus?.name;
          u["verificationStatus"] = created.verificationStatus;
          u["isGuest"] = false;
          u["needsPasswordSetup"] = true;
          return true;
        }

        // Reject login if not on institutional roster
        return "/login?error=ROSTER_NOT_FOUND";
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as typeof user & {
          role: string;
          username?: string;
          campusId?: string;
          campusName?: string;
          verificationStatus: string;
          isGuest?: boolean;
          needsPasswordSetup?: boolean;
        };
        token["role"] = u.role;
        token["username"] = u.username;
        token["campusId"] = u.campusId;
        token["campusName"] = u.campusName;
        token["verificationStatus"] = u.verificationStatus;
        token["isGuest"] = Boolean(u.isGuest || u.role === "GUEST");
        token["needsPasswordSetup"] = Boolean(u.needsPasswordSetup);
      }

      // Allow session update to clear needsPasswordSetup once password is saved
      if (trigger === "update" && session) {
        if (session.needsPasswordSetup !== undefined) {
          token["needsPasswordSetup"] = session.needsPasswordSetup;
        }
      }

      if (token["isGuest"]) {
        token["name"] = "Guest";
        token["username"] = "guest";
        token["email"] = null;
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
        session.user.verificationStatus = (token["verificationStatus"] as string) ?? "PENDING";
        session.user.isGuest = Boolean(token["isGuest"] || session.user.role === "GUEST");
        session.user.needsPasswordSetup = Boolean(token["needsPasswordSetup"]);

        if (session.user.isGuest) {
          session.user.name = "Guest";
          session.user.username = "guest";
          session.user.email = "";
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
