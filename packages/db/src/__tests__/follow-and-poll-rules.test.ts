/**
 * follow-and-poll-rules.test.ts
 *
 * Verifies database-level triggers & integrity rules for:
 *  1. Asymmetric LinkedIn-style UserFollow (allowed 1-way, blocks self-follow, GUEST follow, blocked users)
 *  2. Poll rules:
 *     - GUEST poll vote rejection
 *     - Cross-role poll vote rejection
 *     - SINGLE_SUBMIT lock (cannot resubmit or retract once submitted)
 *     - Single-answer vs Multiple-answer enforcement at DB trigger level
 *     - MULTIPLE_SUBMIT changeable votes without submission lock
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

const SUFFIX = `flwpoll_${Date.now()}`;

let guestId = "";
let studentAId = "";
let studentBId = "";
let alumniId = "";

let singleOncePollId = "";
let singleOnceOptA = "";
let singleOnceOptB = "";

let multiOncePollId = "";
let multiOnceOptA = "";
let multiOnceOptB = "";

let multiChangePollId = "";
let multiChangeOptA = "";
let multiChangeOptB = "";

let studentOnlyPollId = "";
let studentOnlyOptA = "";

beforeAll(async () => {
  const [guest, studentA, studentB, alumni] = await Promise.all([
    ownerClient.userIdentity.create({
      data: {
        displayName: `Guest ${SUFFIX}`,
        username: `gst_${SUFFIX}`,
        role: UserRole.GUEST,
        verificationStatus: VerificationStatus.PENDING,
      },
    }),
    ownerClient.userIdentity.create({
      data: {
        displayName: `Student A ${SUFFIX}`,
        username: `stua_${SUFFIX}`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    ownerClient.userIdentity.create({
      data: {
        displayName: `Student B ${SUFFIX}`,
        username: `stub_${SUFFIX}`,
        role: UserRole.STUDENT,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
    ownerClient.userIdentity.create({
      data: {
        displayName: `Alumni ${SUFFIX}`,
        username: `alm_${SUFFIX}`,
        role: UserRole.ALUMNI,
        verificationStatus: VerificationStatus.VERIFIED,
      },
    }),
  ]);

  guestId = guest.id;
  studentAId = studentA.id;
  studentBId = studentB.id;
  alumniId = alumni.id;

  // Block between studentB and alumni for follow-block test
  await ownerClient.userBlock.create({
    data: { initiatorId: studentBId, targetId: alumniId },
  });

  // Poll 1: Single answer, SINGLE_SUBMIT
  const p1Post = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      type: "POLL",
      body: `Single Once ${SUFFIX}`,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
    },
  });
  const p1 = await ownerClient.poll.create({
    data: {
      postId: p1Post.id,
      question: `Single Once ${SUFFIX}`,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: {
        create: [
          { text: "Option A", sortOrder: 0 },
          { text: "Option B", sortOrder: 1 },
        ],
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  singleOncePollId = p1.id;
  singleOnceOptA = p1.options[0]!.id;
  singleOnceOptB = p1.options[1]!.id;

  // Poll 2: Multiple answer, SINGLE_SUBMIT
  const p2Post = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      type: "POLL",
      body: `Multi Once ${SUFFIX}`,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
    },
  });
  const p2 = await ownerClient.poll.create({
    data: {
      postId: p2Post.id,
      question: `Multi Once ${SUFFIX}`,
      allowMultipleAnswers: true,
      submissionMode: "SINGLE_SUBMIT",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: {
        create: [
          { text: "Track 1", sortOrder: 0 },
          { text: "Track 2", sortOrder: 1 },
        ],
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  multiOncePollId = p2.id;
  multiOnceOptA = p2.options[0]!.id;
  multiOnceOptB = p2.options[1]!.id;

  // Poll 3: Multiple answer, MULTIPLE_SUBMIT
  const p3Post = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      type: "POLL",
      body: `Multi Change ${SUFFIX}`,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
    },
  });
  const p3 = await ownerClient.poll.create({
    data: {
      postId: p3Post.id,
      question: `Multi Change ${SUFFIX}`,
      allowMultipleAnswers: true,
      submissionMode: "MULTIPLE_SUBMIT",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: {
        create: [
          { text: "Menu X", sortOrder: 0 },
          { text: "Menu Y", sortOrder: 1 },
        ],
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  multiChangePollId = p3.id;
  multiChangeOptA = p3.options[0]!.id;
  multiChangeOptB = p3.options[1]!.id;

  // Poll 4: Student-only role-restricted poll
  const p4Post = await ownerClient.post.create({
    data: {
      authorId: studentAId,
      type: "POLL",
      body: `Student Only Poll ${SUFFIX}`,
      targetRoles: ["STUDENT"],
    },
  });
  const p4 = await ownerClient.poll.create({
    data: {
      postId: p4Post.id,
      question: `Student Only Poll ${SUFFIX}`,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      targetRoles: ["STUDENT"],
      options: {
        create: [
          { text: "Yes", sortOrder: 0 },
          { text: "No", sortOrder: 1 },
        ],
      },
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  studentOnlyPollId = p4.id;
  studentOnlyOptA = p4.options[0]!.id;
});

afterAll(async () => {
  // Clean up any leftover test rows by deleting parent posts first (cascades polls -> options/entries/submissions)
  await ownerClient.post.deleteMany({
    where: {
      OR: [
        { authorId: { in: [studentAId, studentBId, alumniId] } },
        { author: { username: { startsWith: "stua_flwpoll_" } } },
      ],
    },
  });
  await ownerClient.userFollow.deleteMany({
    where: {
      OR: [
        { followerId: { in: [guestId, studentAId, studentBId, alumniId] } },
        { followingId: { in: [guestId, studentAId, studentBId, alumniId] } },
      ],
    },
  });
  await ownerClient.userBlock.deleteMany({
    where: { initiatorId: studentBId },
  });
  await ownerClient.userIdentity.deleteMany({
    where: {
      OR: [
        { id: { in: [guestId, studentAId, studentBId, alumniId] } },
        { username: { startsWith: "gst_flwpoll_" } },
        { username: { startsWith: "stua_flwpoll_" } },
        { username: { startsWith: "stub_flwpoll_" } },
        { username: { startsWith: "alm_flwpoll_" } },
      ],
    },
  });
  await ownerClient.$disconnect();
  await appClient.$disconnect();
});

describe("LinkedIn-style Asymmetric UserFollow DB Integrity", () => {
  it("allows instant 1-way follow without approval and rejects duplicate or self-follow", async () => {
    const follow = await appClient.userFollow.create({
      data: { followerId: studentBId, followingId: studentAId, source: "PROFILE" },
    });
    expect(follow.followerId).toBe(studentBId);
    expect(follow.followingId).toBe(studentAId);

    // Self-follow rejected by DB trigger
    await expect(
      appClient.userFollow.create({
        data: { followerId: studentAId, followingId: studentAId, source: "PROFILE" },
      }),
    ).rejects.toThrow(/cannot follow themselves|23514/i);
  });

  it("blocks GUEST follow and blocked-user follow at DB trigger level", async () => {
    await expect(
      appClient.userFollow.create({
        data: { followerId: guestId, followingId: studentAId, source: "PROFILE" },
      }),
    ).rejects.toThrow(/GUEST|42501/i);

    await expect(
      appClient.userFollow.create({
        data: { followerId: studentBId, followingId: alumniId, source: "PROFILE" },
      }),
    ).rejects.toThrow(/Blocked|42501/i);
  });
});

describe("DB-level Poll Voting, Single-Submit Lock & Multi-Answer Rules", () => {
  it("rejects GUEST and unauthorized-role voters at Postgres trigger level", async () => {
    await expect(
      appClient.pollEntry.create({
        data: { pollId: singleOncePollId, optionId: singleOnceOptA, creatorId: guestId },
      }),
    ).rejects.toThrow(/GUEST|42501/i);

    await expect(
      appClient.pollEntry.create({
        data: { pollId: studentOnlyPollId, optionId: studentOnlyOptA, creatorId: alumniId },
      }),
    ).rejects.toThrow(/Access denied|42501/i);
  });

  it("enforces single-answer + SINGLE_SUBMIT permanent lock", async () => {
    await appClient.pollEntry.create({
      data: { pollId: singleOncePollId, optionId: singleOnceOptA, creatorId: studentBId },
    });

    // Attempting second option on single-answer poll fails even before submission row
    await expect(
      appClient.pollEntry.create({
        data: { pollId: singleOncePollId, optionId: singleOnceOptB, creatorId: studentBId },
      }),
    ).rejects.toThrow(/Single-answer|42501/i);

    await appClient.pollSubmission.create({
      data: { pollId: singleOncePollId, userId: studentBId },
    });

    // Cannot retract after submission
    await expect(
      appClient.pollEntry.deleteMany({
        where: { pollId: singleOncePollId, creatorId: studentBId },
      }),
    ).rejects.toThrow(/single-submit|42501/i);
  });

  it("supports multiple-answer SINGLE_SUBMIT selection then locks permanently", async () => {
    await appClient.pollEntry.createMany({
      data: [
        { pollId: multiOncePollId, optionId: multiOnceOptA, creatorId: studentBId },
        { pollId: multiOncePollId, optionId: multiOnceOptB, creatorId: studentBId },
      ],
    });
    await appClient.pollSubmission.create({
      data: { pollId: multiOncePollId, userId: studentBId },
    });

    const count = await appClient.pollEntry.count({
      where: { pollId: multiOncePollId, creatorId: studentBId },
    });
    expect(count).toBe(2);

    await expect(
      appClient.pollEntry.deleteMany({
        where: { pollId: multiOncePollId, creatorId: studentBId },
      }),
    ).rejects.toThrow(/single-submit|42501/i);
  });

  it("allows MULTIPLE_SUBMIT toggling/changing anytime", async () => {
    await appClient.pollEntry.createMany({
      data: [
        { pollId: multiChangePollId, optionId: multiChangeOptA, creatorId: studentBId },
        { pollId: multiChangePollId, optionId: multiChangeOptB, creatorId: studentBId },
      ],
    });
    await appClient.pollSubmission.create({
      data: { pollId: multiChangePollId, userId: studentBId },
    });

    // Allowed to uncheck/retract Option A in MULTIPLE_SUBMIT mode
    await appClient.pollEntry.deleteMany({
      where: { pollId: multiChangePollId, optionId: multiChangeOptA, creatorId: studentBId },
    });
    const remaining = await appClient.pollEntry.findMany({
      where: { pollId: multiChangePollId, creatorId: studentBId },
    });
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.optionId).toBe(multiChangeOptB);
  });
});
