/**
 * post-role-isolation.test.ts
 *
 * Verifies database-level and system-level strict isolation for:
 *  1. Guest post/comment/like/view/invite creation prohibition (DB trigger)
 *  2. Guest read restriction (must be PUBLIC, ALL scope, and ALL THREE roles: STUDENT, FACULTY, ALUMNI)
 *  3. Cross-role isolation (STUDENT-only, FACULTY-only, ALUMNI-only, 2-role combinations)
 *  4. target_roles CHECK constraint (non-empty, valid audience roles only)
 *  5. Interaction triggers (cannot like/comment/view posts outside viewer's target_roles)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client";

const ownerClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["DATABASE_URL"] ??
        "postgresql://stunet_owner:localdevonly@localhost:5434/stunet",
    },
  },
});

const appClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["APP_DATABASE_URL"] ??
        "postgresql://app_service_role:app_localdev_CHANGE_ME@localhost:5434/stunet",
    },
  },
});

const SUFFIX = `roleiso_${Date.now()}`;

let guestId = "";
let studentAId = "";
let studentBId = "";
let facultyId = "";
let alumniId = "";
let clubManagerStudentId = "";

let postAllThreeId = "";
let postStudentOnlyId = "";
let postStudentFacultyId = "";
let postFacultyOnlyId = "";
let postAlumniOnlyId = "";
let postConnectionsAllRolesId = "";

beforeAll(async () => {
  const guest = await ownerClient.userIdentity.create({
    data: {
      displayName: `Test Guest ${SUFFIX}`,
      username: `guest_${SUFFIX}`,
      role: UserRole.GUEST,
      verificationStatus: VerificationStatus.PENDING,
    },
  });
  guestId = guest.id;

  const studentA = await ownerClient.userIdentity.create({
    data: {
      displayName: `Student A ${SUFFIX}`,
      username: `stud_a_${SUFFIX}`,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  studentAId = studentA.id;

  const studentB = await ownerClient.userIdentity.create({
    data: {
      displayName: `Student B ${SUFFIX}`,
      username: `stud_b_${SUFFIX}`,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  studentBId = studentB.id;

  const faculty = await ownerClient.userIdentity.create({
    data: {
      displayName: `Faculty ${SUFFIX}`,
      username: `fac_${SUFFIX}`,
      role: UserRole.FACULTY,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  facultyId = faculty.id;

  const alumni = await ownerClient.userIdentity.create({
    data: {
      displayName: `Alumni ${SUFFIX}`,
      username: `alum_${SUFFIX}`,
      role: UserRole.ALUMNI,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  alumniId = alumni.id;

  const clubMgr = await ownerClient.userIdentity.create({
    data: {
      displayName: `Club Mgr ${SUFFIX}`,
      username: `clubmgr_${SUFFIX}`,
      role: UserRole.CLUB_MANAGER,
      verificationStatus: VerificationStatus.VERIFIED,
    },
  });
  clubManagerStudentId = clubMgr.id;

  // Create posts owned by Student A with varying targetRoles
  const p1 = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      body: `Public All Three ${SUFFIX}`,
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
    },
  });
  postAllThreeId = p1.id;

  const p2 = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      body: `Student Only ${SUFFIX}`,
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT"],
    },
  });
  postStudentOnlyId = p2.id;

  const p3 = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      body: `Student + Faculty (No Alumni) ${SUFFIX}`,
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY"],
    },
  });
  postStudentFacultyId = p3.id;

  const p4 = await ownerClient.post.create({
    data: {
      authorId: facultyId,
      body: `Faculty Only ${SUFFIX}`,
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["FACULTY"],
    },
  });
  postFacultyOnlyId = p4.id;

  const p5 = await ownerClient.post.create({
    data: {
      authorId: alumniId,
      body: `Alumni Only ${SUFFIX}`,
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["ALUMNI"],
    },
  });
  postAlumniOnlyId = p5.id;

  const p6 = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      body: `Connected Only All 3 Roles ${SUFFIX}`,
      visibility: "CONNECTIONS",
      targetConnectionScope: "CONNECTED",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
    },
  });
  postConnectionsAllRolesId = p6.id;
});

afterAll(async () => {
  await ownerClient.post.deleteMany({
    where: {
      authorId: { in: [studentAId, studentBId, facultyId, alumniId, clubManagerStudentId] },
    },
  });
  await ownerClient.userIdentity.deleteMany({
    where: {
      id: { in: [guestId, studentAId, studentBId, facultyId, alumniId, clubManagerStudentId] },
    },
  });
  await ownerClient.$disconnect();
  await appClient.$disconnect();
});

async function canView(postId: string, viewerId: string | null): Promise<boolean> {
  const rows = await appClient.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT stunet_can_view_post(${postId}, ${viewerId}) AS allowed
  `;
  return Boolean(rows[0]?.allowed);
}

describe("DB-level Guest restrictions", () => {
  it("prevents GUEST from creating a post directly at DB level", async () => {
    await expect(
      appClient.post.create({
        data: {
          authorId: guestId,
          body: "Illegal guest post",
          targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
        },
      }),
    ).rejects.toThrow(/GUEST|permission|42501/i);
  });

  it("prevents GUEST from creating a professional invite at DB level", async () => {
    await expect(
      appClient.professionalInvite.create({
        data: {
          creatorUserId: guestId,
          mode: "ONLINE",
          type: "PROJECT",
          name: "Illegal guest invite",
        },
      }),
    ).rejects.toThrow(/GUEST|permission|42501/i);
  });

  it("prevents GUEST from commenting or liking even an all-roles post", async () => {
    await expect(
      appClient.postComment.create({
        data: {
          postId: postAllThreeId,
          userId: guestId,
          content: "Illegal guest comment",
        },
      }),
    ).rejects.toThrow(/GUEST|permission|42501/i);

    await expect(
      appClient.postLike.create({
        data: {
          postId: postAllThreeId,
          userId: guestId,
        },
      }),
    ).rejects.toThrow(/GUEST|permission|42501/i);
  });

  it("enforces target_roles CHECK constraint against empty arrays or GUEST role", async () => {
    await expect(
      appClient.post.create({
        data: {
          authorId: studentAId,
          body: "Empty roles bypass attempt",
          targetRoles: [],
        },
      }),
    ).rejects.toThrow(/posts_target_roles_valid_chk|check constraint/i);

    await expect(
      appClient.post.create({
        data: {
          authorId: studentAId,
          body: "Invalid GUEST role attempt",
          targetRoles: ["GUEST"],
        },
      }),
    ).rejects.toThrow(/posts_target_roles_valid_chk|check constraint/i);
  });
});

describe("DB-level Post & Profile Role Isolation", () => {
  it("allows Guest (null or GUEST id) ONLY on PUBLIC, ALL-scope posts with ALL 3 roles selected", async () => {
    expect(await canView(postAllThreeId, null)).toBe(true);
    expect(await canView(postAllThreeId, guestId)).toBe(true);

    // Even if 1 of 3 is missing -> Guest CANNOT see
    expect(await canView(postStudentFacultyId, null)).toBe(false);
    expect(await canView(postStudentFacultyId, guestId)).toBe(false);

    expect(await canView(postStudentOnlyId, null)).toBe(false);
    expect(await canView(postStudentOnlyId, guestId)).toBe(false);
    expect(await canView(postFacultyOnlyId, guestId)).toBe(false);
    expect(await canView(postAlumniOnlyId, guestId)).toBe(false);
    expect(await canView(postConnectionsAllRolesId, guestId)).toBe(false);
  });

  it("strictly isolates Student-only posts from Faculty and Alumni", async () => {
    expect(await canView(postStudentOnlyId, studentBId)).toBe(true);
    expect(await canView(postStudentOnlyId, clubManagerStudentId)).toBe(true);
    expect(await canView(postStudentOnlyId, facultyId)).toBe(false);
    expect(await canView(postStudentOnlyId, alumniId)).toBe(false);
  });

  it("strictly isolates Student+Faculty posts from Alumni while allowing Student & Faculty", async () => {
    expect(await canView(postStudentFacultyId, studentBId)).toBe(true);
    expect(await canView(postStudentFacultyId, facultyId)).toBe(true);
    expect(await canView(postStudentFacultyId, alumniId)).toBe(false);
  });

  it("strictly isolates Faculty-only and Alumni-only posts", async () => {
    expect(await canView(postFacultyOnlyId, facultyId)).toBe(true);
    expect(await canView(postFacultyOnlyId, studentBId)).toBe(false);
    expect(await canView(postFacultyOnlyId, alumniId)).toBe(false);

    expect(await canView(postAlumniOnlyId, alumniId)).toBe(true);
    expect(await canView(postAlumniOnlyId, studentBId)).toBe(false);
    expect(await canView(postAlumniOnlyId, facultyId)).toBe(false);
  });

  it("blocks Faculty/Alumni from liking, commenting on, or viewing a Student-only post at DB level", async () => {
    await expect(
      appClient.postLike.create({
        data: { postId: postStudentOnlyId, userId: facultyId },
      }),
    ).rejects.toThrow(/Access denied|42501/i);

    await expect(
      appClient.postComment.create({
        data: { postId: postStudentOnlyId, userId: alumniId, content: "Should fail" },
      }),
    ).rejects.toThrow(/Access denied|42501/i);

    await expect(
      appClient.postView.create({
        data: { postId: postStudentOnlyId, userId: facultyId },
      }),
    ).rejects.toThrow(/Access denied|42501/i);
  });
});
