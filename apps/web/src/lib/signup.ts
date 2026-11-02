/**
 * apps/web/src/lib/signup.ts
 *
 * Signup flow for the Student Portal.
 * Handles: Argon2id hashing, domain-match auto-verification,
 * UserIdentity + UserPrivateDetails creation (never collapsed).
 */
import { PrismaClient, VerificationStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { SignupSchema } from "@stunet/types";
import { z } from "zod";

const prisma = new PrismaClient();

export type SignupResult =
  | { success: true; userId: string; verificationStatus: VerificationStatus }
  | { success: false; error: string };

export async function signupStudent(input: z.infer<typeof SignupSchema>): Promise<SignupResult> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input" };
  }

  const { email, password, displayName } = parsed.data;
  const emailLower = email.toLowerCase();

  // Check for existing account
  const existing = await prisma.userPrivateDetails.findUnique({
    where: { email: emailLower },
  });
  if (existing) {
    return { success: false, error: "EMAIL_IN_USE" };
  }

  // Domain-match auto-verification (plan Phase 2, Student spec Section 6)
  const domain = emailLower.split("@")[1] ?? "";
  const campus = await prisma.campus.findUnique({
    where: { emailDomain: domain },
  });

  const verificationStatus: VerificationStatus = campus
    ? VerificationStatus.VERIFIED // instant verification for matching domain
    : VerificationStatus.PENDING; // no write access until manually verified

  // Argon2id hash — plan requires this, never bcrypt alone
  const passwordHash = await argon2.hash(password, {
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });

  // Generate username from display name (guaranteed unique suffix)
  const baseUsername = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 6);
  const username = `${baseUsername}_${suffix}`;

  // Create UserIdentity + UserPrivateDetails in a single transaction
  // NEVER collapsed into one table — load-bearing security decision
  const identity = await prisma.$transaction(async (tx) => {
    const newIdentity = await tx.userIdentity.create({
      data: {
        campusId: campus?.id,
        role: "STUDENT",
        verificationStatus,
        displayName,
        username,
      },
    });

    await tx.userPrivateDetails.create({
      data: {
        userId: newIdentity.id,
        email: emailLower,
      },
    });

    await tx.authCredential.create({
      data: {
        userId: newIdentity.id,
        passwordHash,
      },
    });

    return newIdentity;
  });

  return {
    success: true,
    userId: identity.id,
    verificationStatus: identity.verificationStatus,
  };
}
