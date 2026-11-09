/**
 * apps/web/src/lib/signup.ts
 *
 * Signup flow for the Student & Community Portal (Student, Alumni, Faculty).
 * Handles: Argon2id hashing, domain-match & roster auto-verification,
 * UserIdentity + UserPrivateDetails + AuthCredential creation.
 */
import { PrismaClient, VerificationStatus, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { z } from "zod";

const prisma = new PrismaClient();

export const PortalSignupInputSchema = z.object({
  role: z.enum(["STUDENT", "ALUMNI", "FACULTY"]).default("STUDENT"),
  displayName: z.string().min(2, "Name must be at least 2 characters").max(60).trim(),
  email: z.string().email("Invalid email format").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and a number",
    ),
  campusId: z.string().min(1, "Please select your campus"),
  headline: z.string().max(120).optional().nullable(),
  joiningYear: z.coerce.number().int().min(1950).max(2100).optional().nullable(),
  graduationYear: z.coerce.number().int().min(1950).max(2150).optional().nullable(),
  currentCourseYear: z.coerce.number().int().min(1).max(10).optional().nullable(),
  usn: z.string().max(100).optional().nullable(),
  employeeId: z.string().max(100).optional().nullable(),
});

export type PortalSignupInput = z.infer<typeof PortalSignupInputSchema>;

export type SignupResult =
  | { success: true; userId: string; verificationStatus: VerificationStatus; username: string }
  | { success: false; error: string };

export async function signupMember(input: PortalSignupInput): Promise<SignupResult> {
  const parsed = PortalSignupInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid input parameters";
    return { success: false, error: firstIssue };
  }

  const {
    role,
    email,
    password,
    displayName,
    campusId,
    headline,
    joiningYear,
    graduationYear,
    currentCourseYear,
    usn,
    employeeId,
  } = parsed.data;

  const emailLower = email.toLowerCase().trim();

  // 1. Check for existing account
  const existing = await prisma.userPrivateDetails.findUnique({
    where: { email: emailLower },
  });
  if (existing) {
    return { success: false, error: "EMAIL_IN_USE" };
  }

  // 2. Fetch target campus
  const campus = await prisma.campus.findUnique({
    where: { id: campusId },
  });

  if (!campus) {
    return { success: false, error: "Selected campus was not found." };
  }

  // 3. Auto-verification checks:
  // Check A: Domain match with campus emailDomain
  const emailDomain = emailLower.split("@")[1] ?? "";
  const domainMatches =
    campus.emailDomain &&
    emailDomain.toLowerCase() === campus.emailDomain.toLowerCase().replace(/^@/, "");

  // Check B: Existing roster row for this email and campus
  const rosterRow = await prisma.institutionalRoster.findFirst({
    where: {
      email: emailLower,
      campusId,
    },
  });

  const isAutoVerified = Boolean(domainMatches || rosterRow);
  const verificationStatus: VerificationStatus = isAutoVerified
    ? VerificationStatus.VERIFIED
    : VerificationStatus.PENDING;

  // 4. Argon2id hash password
  const passwordHash = await argon2.hash(password, {
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });

  // 5. Generate unique username
  const baseUsername =
    displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 20) || "user";
  let username = baseUsername;
  let counter = 1;
  while (await prisma.userIdentity.findUnique({ where: { username } })) {
    username = `${baseUsername.slice(0, 15)}_${counter++}`;
  }

  const defaultJoiningYear =
    joiningYear ??
    (new Date().getMonth() >= 7 ? new Date().getFullYear() : new Date().getFullYear() - 1);

  // 6. Transactional creation
  const identity = await prisma.$transaction(async (tx) => {
    const newIdentity = await tx.userIdentity.create({
      data: {
        campusId: campus.id,
        role: role as UserRole,
        verificationStatus,
        displayName,
        username,
        joiningYear: defaultJoiningYear,
        headline:
          headline?.trim() ||
          (role === "FACULTY"
            ? `Faculty · ${campus.name}`
            : role === "ALUMNI"
              ? `Alumni (Class of ${graduationYear ?? defaultJoiningYear + 4}) · ${campus.name}`
              : `Student · ${campus.name}`),
        isActive: true,
        isBanned: false,
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

    // Role-specific records
    if (role === "STUDENT" || role === "ALUMNI") {
      await tx.studentAcademicDetails.create({
        data: {
          userId: newIdentity.id,
          usn: usn?.trim() || `${role === "ALUMNI" ? "ALUM" : "USN"}_${username.toUpperCase()}`,
          currentCourseYear: role === "STUDENT" ? currentCourseYear || null : null,
          joinedYear: defaultJoiningYear,
          graduationYear:
            graduationYear || (role === "ALUMNI" ? defaultJoiningYear + 4 : defaultJoiningYear + 4),
        },
      });
    } else if (role === "FACULTY") {
      await tx.facultyDetails.create({
        data: {
          userId: newIdentity.id,
          employeeId: employeeId?.trim() || `FAC_${username.toUpperCase()}`,
        },
      });
    }

    // Mark roster claimed if it matched
    if (rosterRow) {
      await tx.institutionalRoster.update({
        where: { id: rosterRow.id },
        data: { isClaimed: true },
      });
    }

    return newIdentity;
  });

  return {
    success: true,
    userId: identity.id,
    verificationStatus: identity.verificationStatus,
    username: identity.username,
  };
}

/**
 * Backward compatibility wrapper for signupStudent
 */
export async function signupStudent(input: PortalSignupInput): Promise<SignupResult> {
  return signupMember({
    ...input,
    role: "STUDENT",
    campusId: input.campusId || "",
  });
}
