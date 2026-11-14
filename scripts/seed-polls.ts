/**
 * scripts/seed-polls.ts
 * Idempotently seeds realistic Community Polls covering all poll types:
 *  - Single-choice + Answer once (Submit button) — Campus scope
 *  - Multiple-answer + Answer once (Submit button) — All Campuses
 *  - Multiple-answer + Multiple submit (No submit button) — City/Community scope
 *  - Faculty & Alumni targeted polls so every Home Poll Widget section has real DB data
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.poll.count();
  if (existingCount > 0) {
    console.log(`Polls already exist (${existingCount}), skipping seed.`);
    return;
  }

  const svyasaCampus = await prisma.campus.findFirst({
    where: { OR: [{ slug: { contains: "svyasa" } }, { name: { contains: "S-VYASA" } }] },
    select: { id: true, name: true, city: true, state: true },
  });

  const anyStudent = await prisma.userIdentity.findFirst({
    where: { role: "STUDENT", isActive: true, isBanned: false },
    select: { id: true, campusId: true },
  });
  const anyFaculty = await prisma.userIdentity.findFirst({
    where: { role: "FACULTY", isActive: true, isBanned: false },
    select: { id: true, campusId: true },
  });
  const anyAlumni = await prisma.userIdentity.findFirst({
    where: { role: "ALUMNI", isActive: true, isBanned: false },
    select: { id: true, campusId: true },
  });

  const defaultAuthor = anyStudent?.id ?? anyFaculty?.id ?? anyAlumni?.id;
  if (!defaultAuthor) {
    console.log("No eligible authors found to seed polls.");
    return;
  }

  const pollDefs = [
    {
      authorId: anyStudent?.id ?? defaultAuthor,
      question: "Should the campus library remain open 24/7 during IA and End-Sem exams?",
      isAnonymous: true,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT" as const,
      geoScope: "CAMPUS",
      scopeLabel: svyasaCampus?.name ?? "S-VYASA University",
      campusId: svyasaCampus?.id ?? anyStudent?.campusId ?? null,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: [
        "Yes, definitely 24/7 with overnight study lounge",
        "Open until 2:00 AM is sufficient",
        "No change needed (regular 10 PM close)",
      ],
    },
    {
      authorId: anyStudent?.id ?? defaultAuthor,
      question:
        "Which programming tracks would you like the Advanced Tech Club to host next month? (Select all that apply)",
      isAnonymous: false,
      allowMultipleAnswers: true,
      submissionMode: "SINGLE_SUBMIT" as const,
      geoScope: "ALL",
      scopeLabel: "All Campuses",
      campusId: null,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: [
        "Rust & Systems Programming",
        "Autonomous LLM Agents & Tool Use",
        "Distributed Kubernetes & Docker Infra",
        "Competitive DSA & System Design Bootcamp",
      ],
    },
    {
      authorId: anyStudent?.id ?? defaultAuthor,
      question: "Preferred weekend hack-night & dining options? (Instant vote — change anytime)",
      isAnonymous: false,
      allowMultipleAnswers: true,
      submissionMode: "MULTIPLE_SUBMIT" as const,
      geoScope: "STATE",
      scopeLabel: svyasaCampus ? `${svyasaCampus.state} State` : "Karnataka State",
      campusId: svyasaCampus?.id ?? null,
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      options: [
        "South Indian Special Dosa & Filter Coffee Counter",
        "Overnight Tea & Maggi Station during Hackathons",
        "Continental Bowls & Healthy Salads",
      ],
    },
    ...(anyFaculty
      ? [
          {
            authorId: anyFaculty.id,
            question: "Preferred schedule format for Semester 4 CIA project reviews?",
            isAnonymous: false,
            allowMultipleAnswers: false,
            submissionMode: "SINGLE_SUBMIT" as const,
            geoScope: "CAMPUS",
            scopeLabel: svyasaCampus?.name ?? "S-VYASA University",
            campusId: svyasaCampus?.id ?? anyFaculty.campusId ?? null,
            targetRoles: ["STUDENT", "FACULTY"],
            options: [
              "Continuous 2-Day Evaluation Block",
              "Staggered Afternoon Slots Across Week",
              "Live Demo Day + Rubrics Sheet",
            ],
          },
        ]
      : []),
    ...(anyAlumni
      ? [
          {
            authorId: anyAlumni.id,
            question:
              "Would you join a monthly Alumni 1:1 Resume & Mock Interview Mentorship Sprint?",
            isAnonymous: false,
            allowMultipleAnswers: false,
            submissionMode: "MULTIPLE_SUBMIT" as const,
            geoScope: "ALL",
            scopeLabel: "All Campuses",
            campusId: null,
            targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
            options: [
              "Yes — available for 2 mentorship slots/month",
              "Interested in hosting an AMA webinar",
              "Happy to share internal referrals",
            ],
          },
        ]
      : []),
  ];

  for (const def of pollDefs) {
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          authorId: def.authorId,
          type: "POLL",
          visibility: "PUBLIC",
          targetConnectionScope: "ALL",
          targetRoles: def.targetRoles,
          isAnonymous: def.isAnonymous,
          body: def.question,
          imageUrls: [],
        },
      });
      await tx.poll.create({
        data: {
          postId: post.id,
          question: def.question,
          isAnonymous: def.isAnonymous,
          allowMultipleAnswers: def.allowMultipleAnswers,
          submissionMode: def.submissionMode,
          geoScope: def.geoScope,
          scopeLabel: def.scopeLabel,
          campusId: def.campusId,
          targetConnectionScope: "ALL",
          targetRoles: def.targetRoles,
          options: {
            create: def.options.map((text, idx) => ({ text, sortOrder: idx })),
          },
        },
      });
    });
  }

  console.log(`Seeded ${pollDefs.length} community polls.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
