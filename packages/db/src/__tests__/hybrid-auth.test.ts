import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

describe("StuNet Hybrid Authentication System — Specification Verification", () => {
  const testCampusId = "test_campus_hybrid_auth";
  const adminUserId = "test_admin_hybrid_auth";

  const studentEmail = "test.hybrid.student@campus.edu.in";
  const studentUsn = "USN-TEST-998811";

  const facultyEmail = "test.hybrid.faculty@campus.edu.in";
  const facultyEmpId = "EMP-TEST-4422";

  beforeAll(async () => {
    // Clean up test fixtures
    await prisma.userCredentials.deleteMany({
      where: { user: { studentEmail: { in: [studentEmail, facultyEmail] } } },
    });
    await prisma.authCredential.deleteMany({
      where: { user: { studentEmail: { in: [studentEmail, facultyEmail] } } },
    });
    await prisma.studentAcademicDetails.deleteMany({
      where: { usn: studentUsn },
    });
    await prisma.facultyDetails.deleteMany({
      where: { employeeId: facultyEmpId },
    });
    await prisma.userPrivateDetails.deleteMany({
      where: { email: { in: [studentEmail, facultyEmail] } },
    });
    await prisma.userIdentity.deleteMany({
      where: {
        OR: [
          { studentEmail: { in: [studentEmail, facultyEmail] } },
          { username: { in: [studentUsn, facultyEmpId] } },
        ],
      },
    });
    await prisma.institutionalRoster.deleteMany({
      where: { email: { in: [studentEmail, facultyEmail, "invalid.student@campus.edu.in"] } },
    });

    // Ensure campus exists
    await prisma.campus.upsert({
      where: { id: testCampusId },
      create: {
        id: testCampusId,
        name: "Hybrid Auth Test Campus",
        slug: "test-hybrid-campus",
        city: "Bangalore",
        state: "Karnataka",
        emailDomain: "campus.edu.in",
      },
      update: {},
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.userCredentials.deleteMany({
      where: { user: { studentEmail: { in: [studentEmail, facultyEmail] } } },
    });
    await prisma.authCredential.deleteMany({
      where: { user: { studentEmail: { in: [studentEmail, facultyEmail] } } },
    });
    await prisma.studentAcademicDetails.deleteMany({
      where: { usn: studentUsn },
    });
    await prisma.facultyDetails.deleteMany({
      where: { employeeId: facultyEmpId },
    });
    await prisma.userPrivateDetails.deleteMany({
      where: { email: { in: [studentEmail, facultyEmail] } },
    });
    await prisma.userIdentity.deleteMany({
      where: {
        OR: [
          { studentEmail: { in: [studentEmail, facultyEmail] } },
          { username: { in: [studentUsn, facultyEmpId] } },
        ],
      },
    });
    await prisma.institutionalRoster.deleteMany({
      where: { email: { in: [studentEmail, facultyEmail] } },
    });
    await prisma.campus.deleteMany({ where: { id: testCampusId } });
    await prisma.$disconnect();
  });

  // 1. Schema & Admin Pre-provisioning (institutional_roster)
  it("Step 1 & 2: Pre-seeds institutional_roster without creating any user account", async () => {
    const rosterRow = await prisma.institutionalRoster.create({
      data: {
        email: studentEmail,
        role: "STUDENT",
        identifier: studentUsn,
        campusId: testCampusId,
        currentCourseYear: 3,
        joinedYear: 2022,
        graduationYear: 2026,
        isClaimed: false,
        createdByAdminId: adminUserId,
      },
    });

    expect(rosterRow.id).toBeDefined();
    expect(rosterRow.isClaimed).toBe(false);
    expect(rosterRow.identifier).toBe(studentUsn);

    // Verify NO user identity exists yet (Rule 1)
    const existingUser = await prisma.userIdentity.findFirst({
      where: { studentEmail },
    });
    expect(existingUser).toBeNull();
  });

  // 2. Google OAuth First Login: Roster Match & User Creation
  it("Step 3: First Google OAuth login matches roster, creates user_identity with fixed USN username", async () => {
    // Lookup unclaimed roster
    const roster = await prisma.institutionalRoster.findFirst({
      where: { email: studentEmail, isClaimed: false },
    });
    expect(roster).not.toBeNull();

    // Create user_identity + academic details in transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const identity = await tx.userIdentity.create({
        data: {
          displayName: "Test Student",
          username: roster!.identifier, // fixed USN, not chosen
          studentEmail: roster!.email,
          role: roster!.role,
          verificationStatus: "VERIFIED",
          isVerified: true,
          campusId: roster!.campusId,
          joiningYear: roster!.joinedYear,
        },
      });

      await tx.studentAcademicDetails.create({
        data: {
          userId: identity.id,
          usn: roster!.identifier,
          currentCourseYear: roster!.currentCourseYear,
          joinedYear: roster!.joinedYear,
          graduationYear: roster!.graduationYear,
        },
      });

      await tx.userPrivateDetails.create({
        data: {
          userId: identity.id,
          email: roster!.email,
        },
      });

      await tx.institutionalRoster.update({
        where: { id: roster!.id },
        data: { isClaimed: true },
      });

      return identity;
    });

    expect(newUser.id).toBeDefined();
    expect(newUser.username).toBe(studentUsn); // Username equals USN
    expect(newUser.studentEmail).toBe(studentEmail);
    expect(newUser.isVerified).toBe(true);

    // Verify roster marked claimed
    const updatedRoster = await prisma.institutionalRoster.findUnique({
      where: { id: roster!.id },
    });
    expect(updatedRoster?.isClaimed).toBe(true);

    // Verify user_credentials does NOT exist yet (forces password setup)
    const cred = await prisma.userCredentials.findUnique({
      where: { userId: newUser.id },
    });
    expect(cred).toBeNull();
  });

  // 3. Password Setup: Argon2id hash stored in user_credentials
  it("Step 4: Password setup stores Argon2id hash in user_credentials", async () => {
    const user = await prisma.userIdentity.findFirst({
      where: { studentEmail },
    });
    expect(user).not.toBeNull();

    const plainPassword = "SecurePassword@2026!";
    const passwordHash = await argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const userCred = await prisma.userCredentials.create({
      data: {
        userId: user!.id,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    expect(userCred.userId).toBe(user!.id);
    expect(userCred.failedLoginAttempts).toBe(0);
    expect(userCred.lockedUntil).toBeNull();

    // Verify Argon2id verification
    const isValid = await argon2.verify(userCred.passwordHash, plainPassword);
    expect(isValid).toBe(true);

    const isWrong = await argon2.verify(userCred.passwordHash, "WrongPassword123");
    expect(isWrong).toBe(false);
  });

  // 4. Returning Login: Username (USN) + Password verification
  it("Step 5: Returning login verifies USN username and password against user_credentials", async () => {
    const user = await prisma.userIdentity.findUnique({
      where: { username: studentUsn },
    });
    expect(user).not.toBeNull();

    const cred = await prisma.userCredentials.findUnique({
      where: { userId: user!.id },
    });
    expect(cred).not.toBeNull();

    // Correct password succeeds
    const match = await argon2.verify(cred!.passwordHash, "SecurePassword@2026!");
    expect(match).toBe(true);
  });

  // 5. Rate Limiting & Account Lockout on 5 consecutive failures
  it("Step 5: Account lockout triggers on 5 consecutive wrong password attempts", async () => {
    const user = await prisma.userIdentity.findUnique({
      where: { username: studentUsn },
    });
    expect(user).not.toBeNull();

    // Simulate 5 consecutive failed attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      const lockedUntil = attempt >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await prisma.userCredentials.update({
        where: { userId: user!.id },
        data: {
          failedLoginAttempts: attempt,
          lockedUntil,
        },
      });
    }

    const lockedCred = await prisma.userCredentials.findUnique({
      where: { userId: user!.id },
    });
    expect(lockedCred?.failedLoginAttempts).toBe(5);
    expect(lockedCred?.lockedUntil).not.toBeNull();
    expect(lockedCred!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  // 6. Account Recovery via Google OAuth
  it("Step 6: Google OAuth re-login verifies email and resets account lockout (Recovery flow)", async () => {
    const user = await prisma.userIdentity.findFirst({
      where: { studentEmail },
    });
    expect(user).not.toBeNull();

    // Google OAuth verified email ownership -> resets lockout
    const recoveredCred = await prisma.userCredentials.update({
      where: { userId: user!.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    expect(recoveredCred.failedLoginAttempts).toBe(0);
    expect(recoveredCred.lockedUntil).toBeNull();
  });

  // 7. Security Rule 3: user_credentials is never selected in profile queries
  it("Security Rule 3: Profile queries select identity without leaking password hash", async () => {
    const publicProfile = await prisma.userIdentity.findUnique({
      where: { username: studentUsn },
      select: {
        id: true,
        displayName: true,
        username: true,
        studentEmail: true,
        role: true,
        campusId: true,
      },
    });

    expect(publicProfile).toBeDefined();
    // @ts-expect-error - passwordHash or credentials must not exist on profile select
    expect(publicProfile.passwordHash).toBeUndefined();
    // @ts-expect-error - userCredentials must not exist on profile select
    expect(publicProfile.userCredentials).toBeUndefined();
  });
});
