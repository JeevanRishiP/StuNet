import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Updating IA 1, Skill Assessment 1 & 2, and Subjects in PostgreSQL database...");

  const campus = await prisma.campus.findUnique({
    where: { slug: "niat-s-vyasa-bangalore" },
  });

  if (!campus) {
    throw new Error("S-VYASA campus not found!");
  }

  const campusId = campus.id;
  const adminUser = await prisma.userIdentity.findFirst({
    where: { campusId, role: "CAMPUS_MANAGER" },
  });
  const createdById = adminUser?.id || "admin-system";

  console.log(`Using Campus: ${campus.name} (${campusId})`);

  // ────────────────────────────────────────────────────────────
  // 1. UPDATE SEMESTER SUBJECTS (Course Question Bank Links & Syllabus)
  // ────────────────────────────────────────────────────────────
  const subjectUpdates = [
    {
      code: "BTNX312",
      name: "Logical Reasoning",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=349575d8-b061-4eed-83f7-5957d37caf2b",
      syllabus:
        "Introduction, Linear Arrangements, Circular Arrangements, Blood Relations 1, Blood Relations 2",
    },
    {
      code: "BTNX331",
      name: "Core Data Structure and Intermediate Algorithms",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=256ac61d-6f28-4bc3-a0ba-12c60f4db339",
      syllabus:
        "Hashing, Prefix Sum, Sliding Window, Two-Pointer Technique, Longest Subarray with Sum K, Largest Subarray Sum, Two Sum, Introduction to Linked List, Insertion in Linked List, Deletion in Linked List, Introduction to Doubly Linked List, Insertion in Doubly Linked List, Deletion in Doubly Linked List, Circular Linked List, Reversing a Linked List, Cycle Detection In Linked List, Length of Cycle In Linked List, Adding Two Numbers, Merge Two Sorted Linked List, Intersection Of Two Linked Lists, Flatten a Linked List",
    },
    {
      code: "BTNX314",
      name: "AI for Finance",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=9b8e44c1-7d2d-45bf-970a-89db6e267493",
      syllabus:
        "Your Learning Journey, Introduction to AI For Finance, Building Personal Finance Advisor, Introduction to RAG Evaluation",
    },
    {
      code: "BTNX311",
      name: "Fundamentals of Probability and Statistics",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=72fb920b-1990-4554-a58f-0f5df8830865",
      syllabus:
        "Introduction to Probability & Statistics in ML, Introduction to Statistics & Datasets, Data Visualization - I, Data Visualization - II, Measures of Central Tendency, Measures of Variability, Skewness and Outliers, Basics of Probability, Probability Rules & Theorems, Conditional Probability, Law of Partition and Total Probability, Baye's Theorem and counting principles",
    },
    {
      code: "BTNX313",
      name: "Applied Communication English",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=4e008ee5-56af-473f-833e-ebff80ddc5ee",
      syllabus:
        "Accuracy in sentence structure, Accuracy in Sentence Structure: Activity, The Language of Connection, The Language of Connection, The Language of Connection: Activity, Real Time Session 1: Activity, Real Time Session 1: Activity",
    },
    {
      code: "BTNX333",
      name: "Backend Development",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=8b9ab388-ae58-4058-acf5-0c6d9ccd1687",
      syllabus:
        "Introduction to Backend Development, Cloud IDE Walkthrough, Introduction to Express JS, Solving A Node JS Question In Cloud IDE, Introduction to Express JS | Part 2, Introduction to Express JS | Part 3, REST APIs, Debugging Common Errors, Debugging Common Errors | Part 2",
    },
  ];

  for (const s of subjectUpdates) {
    const existing = await prisma.semesterSubject.findFirst({
      where: { campusId, batchYear: 2025, semester: 3, code: s.code },
    });
    if (existing) {
      await prisma.semesterSubject.update({
        where: { id: existing.id },
        data: {
          questionBankUrl: s.questionBankUrl,
          syllabus: s.syllabus,
        },
      });
      console.log(`✓ Updated SemesterSubject: ${s.code} - ${s.name}`);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 2. UPDATE IA 1 IN CAMPUS_IA_EXAMS (Document Timetable & Syllabus)
  // ────────────────────────────────────────────────────────────
  const ia1Exams = [
    {
      code: "BTNX331",
      subject: "Core Data Structure and Intermediate Algorithms",
      dateStr: "2026-09-28T04:30:00.000Z", // 10:00 AM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Hashing, Prefix Sum, Sliding Window, Two-Pointer Technique, Longest Subarray with Sum K, Largest Subarray Sum, Two Sum, Introduction to Linked List, Insertion in Linked List, Deletion in Linked List, Introduction to Doubly Linked List, Insertion in Doubly Linked List, Deletion in Doubly Linked List, Circular Linked List, Reversing a Linked List, Cycle Detection In Linked List, Length of Cycle In Linked List, Adding Two Numbers, Merge Two Sorted Linked List, Intersection Of Two Linked Lists, Flatten a Linked List",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=256ac61d-6f28-4bc3-a0ba-12c60f4db339",
    },
    {
      code: "BTNX313",
      subject: "Applied Communication English",
      dateStr: "2026-09-28T08:30:00.000Z", // 2:00 PM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Accuracy in sentence structure, Accuracy in Sentence Structure: Activity, The Language of Connection, The Language of Connection, The Language of Connection: Activity, Real Time Session 1: Activity, Real Time Session 1: Activity",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=4e008ee5-56af-473f-833e-ebff80ddc5ee",
    },
    {
      code: "BTNX333",
      subject: "Backend Development",
      dateStr: "2026-09-29T04:30:00.000Z", // 10:00 AM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Introduction to Backend Development, Cloud IDE Walkthrough, Introduction to Express JS, Solving A Node JS Question In Cloud IDE, Introduction to Express JS | Part 2, Introduction to Express JS | Part 3, REST APIs, Debugging Common Errors, Debugging Common Errors | Part 2",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=8b9ab388-ae58-4058-acf5-0c6d9ccd1687",
    },
    {
      code: "BTNX311",
      subject: "Fundamentals of Probability and Statistics",
      dateStr: "2026-09-29T08:30:00.000Z", // 2:00 PM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Introduction to Probability & Statistics in ML, Introduction to Statistics & Datasets, Data Visualization - I, Data Visualization - II, Measures of Central Tendency, Measures of Variability, Skewness and Outliers, Basics of Probability, Probability Rules & Theorems, Conditional Probability, Law of Partition and Total Probability, Baye's Theorem and counting principles",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=72fb920b-1990-4554-a58f-0f5df8830865",
    },
    {
      code: "BTNX314",
      subject: "AI for Finance",
      dateStr: "2026-09-30T04:30:00.000Z", // 10:00 AM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Your Learning Journey, Introduction to AI For Finance, Building Personal Finance Advisor, Introduction to RAG Evaluation",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=9b8e44c1-7d2d-45bf-970a-89db6e267493",
    },
    {
      code: "BTNX312",
      subject: "Logical Reasoning",
      dateStr: "2026-09-30T08:30:00.000Z", // 2:00 PM IST
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      syllabus:
        "Introduction, Linear Arrangements, Circular Arrangements, Blood Relations 1, Blood Relations 2",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=349575d8-b061-4eed-83f7-5957d37caf2b",
    },
  ];

  for (const exam of ia1Exams) {
    const existing = await prisma.campusIaExam.findFirst({
      where: {
        campusId,
        examType: "IA-1",
        OR: [{ code: exam.code }, { subject: { contains: exam.code } }],
      },
    });

    if (existing) {
      await prisma.campusIaExam.update({
        where: { id: existing.id },
        data: {
          subject: `${exam.subject} (${exam.code})`,
          code: exam.code,
          scheduledAt: new Date(exam.dateStr),
          durationMins: exam.durationMins,
          venue: exam.venue,
          syllabus: exam.syllabus,
          questionBankUrl: exam.questionBankUrl,
          isTentative: false,
        },
      });
      console.log(`✓ Updated IA-1 in DB: ${exam.code} (${exam.subject})`);
    } else {
      await prisma.campusIaExam.create({
        data: {
          campusId,
          createdById,
          examType: "IA-1",
          subject: `${exam.subject} (${exam.code})`,
          code: exam.code,
          scheduledAt: new Date(exam.dateStr),
          durationMins: exam.durationMins,
          venue: exam.venue,
          syllabus: exam.syllabus,
          questionBankUrl: exam.questionBankUrl,
          isTentative: false,
        },
      });
      console.log(`✓ Created IA-1 in DB: ${exam.code} (${exam.subject})`);
    }
  }

  // ────────────────────────────────────────────────────────────
  // 3. SKILL ASSESSMENT 1 (Conducted on 26 October 2026 - Completed)
  // ────────────────────────────────────────────────────────────
  const sa1Subjects = [
    {
      name: "AI for Finance",
      code: "BTNX314",
      syllabus:
        "Your Learning Journey, Introduction to AI For Finance, Building Personal Finance Advisor, Introduction to RAG Evaluation, Enhancing Productivity with AI, Building a Trading Agent | Part 1",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=9b8e44c1-7d2d-45bf-970a-89db6e267493",
    },
    {
      name: "Logical Reasoning and Analytical Skills",
      code: "BTNX312",
      syllabus: "Introduction, Data Arrangements, Blood Relations",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=349575d8-b061-4eed-83f7-5957d37caf2b",
    },
    {
      name: "Probability and Statistics",
      code: "BTNX311",
      syllabus:
        "Introduction to Probability & Statistics in ML, Introduction to Statistics & Datasets, Data Visualization - I, Data Visualization - II, Data Visualization Implementation, Measures of Central Tendency, Measures of Central Tendency Implementation, Measures of Variability, Skewness and Outliers, Measures of Variability Implementation, Basics of Probability, Probability Rules & Theorems, Conditional Probability, Law of Partition and Total Probability",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=72fb920b-1990-4554-a58f-0f5df8830865",
    },
    {
      name: "Backend Development",
      code: "BTNX333",
      syllabus:
        "Introduction to Backend Development, Introduction to Express JS, Introduction to Express JS | Part 2, Introduction to Express JS | Part 3",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=8b9ab388-ae58-4058-acf5-0c6d9ccd1687",
    },
    {
      name: "Applied Communication Skills",
      code: "BTNX313",
      syllabus:
        "Accuracy in sentence structure, Accuracy in Sentence Structure: Activity, The Language of Connection, The Language of Connection: Activity, Real Time Session 1: Activity, Mastering the Art of Discussion, Mastering the Art of Discussion: Activity, Designing Clear Prompts, Designing Clear Prompts: Activity",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=4e008ee5-56af-473f-833e-ebff80ddc5ee",
    },
    {
      name: "Core Data Structure and Intermediate Algorithms",
      code: "BTNX331",
      syllabus:
        "Hashing, Prefix Sum, Sliding Window, Two-Pointer Technique, Longest Subarray with Sum K, Largest Subarray Sum, Two Sum, Introduction to Linked List, Insertion in Linked List, Deletion in Linked List, Introduction to Doubly Linked List, Insertion in Doubly Linked List, Deletion in Doubly Linked List",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=256ac61d-6f28-4bc3-a0ba-12c60f4db339",
    },
  ];

  // Remove any existing SA 1 records first for clean sync
  await prisma.campusIaExam.deleteMany({
    where: {
      campusId,
      examType: "SKILL-ASSESSMENT-1",
    },
  });

  for (const s of sa1Subjects) {
    await prisma.campusIaExam.create({
      data: {
        campusId,
        createdById,
        examType: "SKILL-ASSESSMENT-1",
        subject: s.name,
        code: s.code,
        scheduledAt: new Date("2026-10-26T04:00:00.000Z"), // 26 October 2026, 9:30 AM IST
        durationMins: 360,
        venue: "Main Computer Science Laboratories & CCBP LMS",
        syllabus: s.syllabus,
        questionBankUrl: s.questionBankUrl,
        isTentative: false,
        notes: "Skill Assessment 1 (Conducted on 26 October 2026 - Completed)",
      },
    });
    console.log(`✓ Inserted Skill Assessment 1 in DB: ${s.code} - ${s.name}`);
  }

  // ────────────────────────────────────────────────────────────
  // 4. SKILL ASSESSMENT 2 (Conducted on 20 November 2026 - Current)
  // ────────────────────────────────────────────────────────────
  const sa2Subjects = [
    {
      name: "AI for Finance",
      code: "BTNX314",
      syllabus:
        "Building a Trading Agent – Part 1 & Part 2, Introduction to LLM Observability, Integrating LangSmith with the Trading Agent, Building a Financial Fraud Detection Model – Part 1",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
    {
      name: "Advanced Communication Skills",
      code: "BTNX313",
      syllabus:
        "Real Time Session 2 & 3 Activities, Framing Effective Questions, Emphasizing Self-Expression",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
    {
      name: "Backend Development",
      code: "BTNX333",
      syllabus:
        "REST APIs, Debugging Common Errors – Part 1 & Part 2, Authentication – Part 1 & Part 2",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
    {
      name: "Design and Analysis of Algorithms",
      code: "BTNX331",
      syllabus:
        "Circular Linked List, Reversing a Linked List, Cycle Detection & Length of Cycle, Adding Two Numbers, Merge Two Sorted Linked Lists, Intersection of Two Linked Lists, Flatten a Linked List, Introduction to Stack, Stack Implementation Using Array & Linked List, Introduction to Monotonic Stacks",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
    {
      name: "Logical Reasoning and Analytical Skills",
      code: "BTNX312",
      syllabus: "Arrangements & Blood Relations, Venn Diagrams, Syllogisms 1 & 2",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
    {
      name: "Probability and Statistics",
      code: "BTNX311",
      syllabus:
        "Skewness & Outliers Implementation, Bayes' Theorem and Counting Principles, Discrete & Continuous Random Variables, Binomial Distribution, Fundamentals of Probability Implementation, Poisson Distribution, Normal Distribution – I & II, Module Quiz 1",
      questionBankUrl: "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62",
    },
  ];

  // Also clean old generic SKILL-ASSESSMENT and SKILL-ASSESSMENT-2
  await prisma.campusIaExam.deleteMany({
    where: {
      campusId,
      examType: { in: ["SKILL-ASSESSMENT", "SKILL-ASSESSMENT-2"] },
    },
  });

  for (const s of sa2Subjects) {
    await prisma.campusIaExam.create({
      data: {
        campusId,
        createdById,
        examType: "SKILL-ASSESSMENT-2",
        subject: s.name,
        code: s.code,
        scheduledAt: new Date("2026-11-20T04:00:00.000Z"), // 20 November 2026, 9:30 AM IST
        durationMins: 360,
        venue: "Main Computer Science Laboratories & CCBP LMS",
        syllabus: s.syllabus,
        questionBankUrl: s.questionBankUrl,
        isTentative: false,
        notes: "Skill Assessment 2 (Conducted on 20 November 2026 - Active Evaluation)",
      },
    });
    console.log(`✓ Inserted Skill Assessment 2 in DB: ${s.code} - ${s.name}`);
  }

  console.log("\n All database records successfully updated in PostgreSQL!");
}

main()
  .catch((e) => {
    console.error("Error executing database update:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
