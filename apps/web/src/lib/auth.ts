/**
 * apps/web/src/lib/auth.ts
 * NextAuth v5 config for the Student & Faculty Portal.
 *
 * Requirements (Plan Delta v3):
 * - Roster-First Google OAuth Provisioning.
 * - Login succeeds ONLY if authenticated Google account matches an unclaimed roster row in institutional_roster
 *   or an existing claimed user.
 * - If no roster match: rejected with:
 *   "This email isn't on your campus's roster yet — ask your campus admin to add you"
 * - Supports both Live Google OAuth and local Simulated Google Sign-In with strict roster enforcement.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

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

  // Generate unique username
  const emailPrefix =
    normalizedEmail
      .split("@")[0]
      ?.replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 20) || "user";
  let username = emailPrefix;
  let counter = 1;
  while (await prisma.userIdentity.findUnique({ where: { username } })) {
    username = `${emailPrefix.slice(0, 16)}_${counter++}`;
  }

  const role = rosterEntry.role as UserRole;

  return await prisma.$transaction(async (tx) => {
    // 1. Create UserIdentity
    const identity = await tx.userIdentity.create({
      data: {
        displayName: displayName?.trim() || emailPrefix,
        username,
        role,
        verificationStatus: "VERIFIED",
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

    // Dedicated Guest Access Provider (No Email Required)
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
        };
      },
    }),

    // Google Sign-In Provider (with strict Roster-First validation)
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

        // 1. Check if user already exists
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
          }
        }

        // 2. Not an existing user: Check institutional roster
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
          };
        }

        // Check if domain belongs to a campus
        const emailDomain = normalizedEmail.split("@")[1];
        const isCampusDomain = emailDomain
          ? await prisma.campus.findFirst({
              where: { emailDomain: { equals: emailDomain, mode: "insensitive" } },
            })
          : null;

        if (isCampusDomain) {
          // Reject login if institutional domain is not on roster
          throw new Error("ROSTER_NOT_FOUND");
        }

        // 3. Public / Non-institutional domain -> Create as GUEST user
        const safePrefix =
          normalizedEmail
            .split("@")[0]
            ?.replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 15) || "guest";
        let guestUsername = `guest_${safePrefix}`;
        let count = 1;
        while (await prisma.userIdentity.findUnique({ where: { username: guestUsername } })) {
          guestUsername = `guest_${safePrefix}_${count++}`;
        }

        const guestUser = await prisma.userIdentity.create({
          data: {
            displayName: googleName || "Guest Visitor",
            username: guestUsername,
            role: "GUEST",
            verificationStatus: "PENDING",
            campusId: null,
            avatarUrl: googleAvatar ?? null,
            headline: "Guest User · Public Access",
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
            user.id = identity.id;
            user.name = identity.displayName;
            const u = user as unknown as Record<string, unknown>;
            u["username"] = identity.username;
            u["role"] = identity.role;
            u["campusId"] = identity.campusId ?? undefined;
            u["campusName"] = identity.campus?.name;
            u["verificationStatus"] = identity.verificationStatus;
            u["isGuest"] = identity.role === "GUEST";
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
          return true;
        }

        // Check if institutional domain
        const emailDomain = normalizedEmail.split("@")[1];
        const isCampusDomain = emailDomain
          ? await prisma.campus.findFirst({
              where: { emailDomain: { equals: emailDomain, mode: "insensitive" } },
            })
          : null;

        if (isCampusDomain) {
          return "/login?error=ROSTER_NOT_FOUND";
        }

        // Otherwise auto-provision as GUEST
        const safePrefix =
          normalizedEmail
            .split("@")[0]
            ?.replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 15) || "guest";
        let guestUsername = `guest_${safePrefix}`;
        let count = 1;
        while (await prisma.userIdentity.findUnique({ where: { username: guestUsername } })) {
          guestUsername = `guest_${safePrefix}_${count++}`;
        }

        const guestUser = await prisma.userIdentity.create({
          data: {
            displayName: user.name || "Guest Visitor",
            username: guestUsername,
            role: "GUEST",
            verificationStatus: "PENDING",
            campusId: null,
            avatarUrl: user.image ?? null,
            headline: "Guest User · Public Access",
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

        user.id = guestUser.id;
        user.name = guestUser.displayName;
        const u = user as unknown as Record<string, unknown>;
        u["username"] = guestUser.username;
        u["role"] = "GUEST";
        u["campusId"] = undefined;
        u["campusName"] = undefined;
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
        token["isGuest"] = Boolean(u.isGuest || u.role === "GUEST");
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
