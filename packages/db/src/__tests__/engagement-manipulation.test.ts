/**
 * engagement-manipulation.test.ts
 *
 * Verifies Engagement-Manipulation Detection (Section 9 Bot & Abuse Resistance):
 * 1. An account liking only a single author's posts repeatedly (>80% share) gets flagged in engagement_anomaly_flags.
 * 2. An account with normal, varied liking patterns (<=80% share) does NOT get flagged.
 * 3. Anomaly flags are stored with status = FLAGGED, concentrationRatio, window dates, and NEVER auto-acts.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client";
import { detectEngagementManipulation } from "../engagement-manipulation";

const prisma = new PrismaClient({
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

const adminClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["ADMIN_DATABASE_URL"] ??
        "postgresql://admin_service_role:admin_localdev_CHANGE_ME@localhost:5434/stunet",
    },
  },
});

const SUFFIX = `anom_${Date.now()}`;

let authorAId = "";
let authorBId = "";
let authorCId = "";

let manipulatorUserId = "";
let normalUserId = "";

const createdPostIds: string[] = [];

beforeAll(async () => {
  // 1. Create 3 Authors
  const [authorA, authorB, authorC] = await Promise.all([
    prisma.userIdentity.create({
      data: {
        displayName: `Author A ${SUFFIX}`,
        username: `author_a_${SUFFIX}`,
        studentEmail: `author_a_${SUFFIX}@test.edu`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    prisma.userIdentity.create({
      data: {
        displayName: `Author B ${SUFFIX}`,
        username: `author_b_${SUFFIX}`,
        studentEmail: `author_b_${SUFFIX}@test.edu`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    prisma.userIdentity.create({
      data: {
        displayName: `Author C ${SUFFIX}`,
        username: `author_c_${SUFFIX}`,
        studentEmail: `author_c_${SUFFIX}@test.edu`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
  ]);

  authorAId = authorA.id;
  authorBId = authorB.id;
  authorCId = authorC.id;

  // 2. Create Manipulator and Normal users
  const [manipulator, normal] = await Promise.all([
    prisma.userIdentity.create({
      data: {
        displayName: `Manipulator ${SUFFIX}`,
        username: `manipulator_${SUFFIX}`,
        studentEmail: `manipulator_${SUFFIX}@test.edu`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    prisma.userIdentity.create({
      data: {
        displayName: `Normal User ${SUFFIX}`,
        username: `normal_${SUFFIX}`,
        studentEmail: `normal_${SUFFIX}@test.edu`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
  ]);

  manipulatorUserId = manipulator.id;
  normalUserId = normal.id;

  // 3. Create Posts
  // Author A has 5 posts
  const postsA = await Promise.all(
    [1, 2, 3, 4, 5].map((i) =>
      prisma.post.create({
        data: {
          authorId: authorAId,
          body: `Post A${i} ${SUFFIX}`,
          targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
        },
      }),
    ),
  );

  // Author B has 2 posts
  const postsB = await Promise.all(
    [1, 2].map((i) =>
      prisma.post.create({
        data: {
          authorId: authorBId,
          body: `Post B${i} ${SUFFIX}`,
          targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
        },
      }),
    ),
  );

  // Author C has 2 posts
  const postsC = await Promise.all(
    [1, 2].map((i) =>
      prisma.post.create({
        data: {
          authorId: authorCId,
          body: `Post C${i} ${SUFFIX}`,
          targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
        },
      }),
    ),
  );

  createdPostIds.push(
    ...postsA.map((p) => p.id),
    ...postsB.map((p) => p.id),
    ...postsC.map((p) => p.id),
  );

  // 4. Manipulator User likes ONLY Author A's posts (5/5 likes = 100% share > 80%)
  for (const p of postsA) {
    await prisma.postLike.create({
      data: {
        postId: p.id,
        userId: manipulatorUserId,
      },
    });
  }

  // 5. Normal User likes posts across varied authors:
  // 1 like on Author A, 2 likes on Author B, 2 likes on Author C (max 2/5 = 40% <= 80%)
  await prisma.postLike.create({ data: { postId: postsA[0]!.id, userId: normalUserId } });
  await prisma.postLike.create({ data: { postId: postsB[0]!.id, userId: normalUserId } });
  await prisma.postLike.create({ data: { postId: postsB[1]!.id, userId: normalUserId } });
  await prisma.postLike.create({ data: { postId: postsC[0]!.id, userId: normalUserId } });
  await prisma.postLike.create({ data: { postId: postsC[1]!.id, userId: normalUserId } });
});

afterAll(async () => {
  await prisma.engagementAnomalyFlag.deleteMany({
    where: { userId: { in: [manipulatorUserId, normalUserId] } },
  });
  await prisma.postLike.deleteMany({
    where: { postId: { in: createdPostIds } },
  });
  await prisma.post.deleteMany({
    where: { id: { in: createdPostIds } },
  });
  await prisma.userIdentity.deleteMany({
    where: { id: { in: [authorAId, authorBId, authorCId, manipulatorUserId, normalUserId] } },
  });
  await appClient.$disconnect();
  await adminClient.$disconnect();
  await prisma.$disconnect();
});

describe("Engagement-Manipulation Detection", () => {
  it("flags manipulator account under app_service_role and does NOT flag varied normal account", async () => {
    // 1. Worker runs detectEngagementManipulation using app_service_role
    const summary = await detectEngagementManipulation(appClient, {
      windowDays: 30,
      threshold: 0.8,
      minLikes: 3,
    });

    expect(summary.scannedUsersCount).toBeGreaterThanOrEqual(2);

    // Verify manipulator is present in flagged list
    const manipulatorFlag = summary.flags.find((f) => f.userId === manipulatorUserId);
    expect(manipulatorFlag).toBeDefined();
    expect(manipulatorFlag?.concentrationRatio).toBe(1.0); // 100% concentration
    expect(manipulatorFlag?.totalLikes).toBe(5);
    expect(manipulatorFlag?.maxAuthorLikes).toBe(5);

    // Verify normal user is NOT flagged
    const normalFlag = summary.flags.find((f) => f.userId === normalUserId);
    expect(normalFlag).toBeUndefined();

    // Verify database row in engagement_anomaly_flags
    const dbFlag = await appClient.engagementAnomalyFlag.findFirst({
      where: { userId: manipulatorUserId },
    });
    expect(dbFlag).not.toBeNull();
    expect(dbFlag?.status).toBe("FLAGGED");
    expect(dbFlag?.concentrationRatio).toBe(1.0);

    const normalDbFlag = await appClient.engagementAnomalyFlag.findFirst({
      where: { userId: normalUserId },
    });
    expect(normalDbFlag).toBeNull();

    // 2. Admin Portal reviews and updates flag status under admin_service_role
    if (dbFlag) {
      const updatedFlag = await adminClient.engagementAnomalyFlag.update({
        where: { id: dbFlag.id },
        data: { status: "REVIEWED" },
      });
      expect(updatedFlag.status).toBe("REVIEWED");

      const dismissedFlag = await adminClient.engagementAnomalyFlag.update({
        where: { id: dbFlag.id },
        data: { status: "DISMISSED" },
      });
      expect(dismissedFlag.status).toBe("DISMISSED");

      // Verify app_service_role cannot UPDATE status (least-privilege enforcement)
      await expect(
        appClient.engagementAnomalyFlag.update({
          where: { id: dbFlag.id },
          data: { status: "FLAGGED" },
        }),
      ).rejects.toThrow(/permission denied/i);

      // Verify admin_service_role cannot DELETE row (least-privilege enforcement)
      await expect(
        adminClient.engagementAnomalyFlag.delete({
          where: { id: dbFlag.id },
        }),
      ).rejects.toThrow(/permission denied/i);
    }
  });
});
