import { prisma } from "../packages/db/src";

async function seedSvyasa3rdSem() {
  console.log("Starting S-VYASA 3rd Sem (2025 Batch) Academic Data Seeding...");

  const campusId = "cmw0t9cgf0005yq6sgrcz4tpy"; // S-VYASA University School of Advanced Studies
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });

  if (!campus) {
    throw new Error(`Campus not found with id: ${campusId}`);
  }

  // Find campus manager or admin for createdById
  const manager = await prisma.userIdentity.findFirst({
    where: {
      campusId,
      role: { in: ["CAMPUS_MANAGER", "SUPER_ADMIN"] },
    },
  });

  const createdById = manager?.id || "cmw75f9l4000113qcenbvsqrq";

  console.log(`Using campus: ${campus.name} (${campus.id})`);
  console.log(`Using createdById: ${createdById}`);

  // ─────────────────────────────────────────────────────────────
  // 1. SEMESTER SUBJECTS (3rd Sem, 2025 Joined Batch)
  // ─────────────────────────────────────────────────────────────
  console.log("\n1. Seeding Semester Subjects...");

  // Purge existing 3rd sem subjects for this campus to avoid duplicate collisions
  await prisma.semesterSubject.deleteMany({
    where: {
      campusId,
      batchYear: 2025,
      semester: 3,
    },
  });

  const subjectsData = [
    {
      name: "Core Data Structure and Intermediate Algorithms",
      code: "BTNX331",
      credits: 4,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["G Satya Aparna"],
      teachingFacultyIds: ["cmw_fac_001"],
    },
    {
      name: "Applied Communication English",
      code: "BTNX313",
      credits: 3,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["Jancy Bhaskar"],
      teachingFacultyIds: ["cmw_fac_003"],
    },
    {
      name: "Backend Development",
      code: "BTNX333",
      credits: 4,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["Sushmitha Amarnath"],
      teachingFacultyIds: ["cmw_fac_002"],
    },
    {
      name: "Fundamentals of Probability and Statistics",
      code: "BTNX311",
      credits: 3,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["G Satya Aparna"],
      teachingFacultyIds: ["cmw_fac_001"],
    },
    {
      name: "AI for Finance",
      code: "BTNX314",
      credits: 3,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["Sushmitha Amarnath"],
      teachingFacultyIds: ["cmw_fac_002"],
    },
    {
      name: "Logical Reasoning",
      code: "BTNX312",
      credits: 2,
      type: "Theory",
      handledBy: "NIAT",
      teachingFacultyNames: ["Jancy Bhaskar"],
      teachingFacultyIds: ["cmw_fac_003"],
    },
    {
      name: "Yoga and Wellness",
      code: "SVY301",
      credits: 2,
      type: "Theory",
      handledBy: "University", // S-VYASA University Subject
      teachingFacultyNames: ["S-VYASA Yoga Faculty"],
      teachingFacultyIds: [],
    },
  ];

  for (const sub of subjectsData) {
    const created = await prisma.semesterSubject.create({
      data: {
        campusId,
        batchYear: 2025,
        semester: 3,
        name: sub.name,
        code: sub.code,
        credits: sub.credits,
        type: sub.type,
        handledBy: sub.handledBy,
        teachingFacultyNames: sub.teachingFacultyNames,
        teachingFacultyIds: sub.teachingFacultyIds,
      },
    });
    console.log(`  ✓ Added Subject: [${created.code}] ${created.name} (${created.handledBy})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. IA EXAMS (IA 1 & IA 2)
  // ─────────────────────────────────────────────────────────────
  console.log("\n2. Seeding IA Exams...");

  // Purge existing IA exams for this campus
  await prisma.campusIaExam.deleteMany({
    where: { campusId },
  });

  const iaExamsData = [
    // ── IA 1 (Sep 28 - Sep 30, 2026) ──
    {
      subject: "Core Data Structure and Intermediate Algorithms (BTNX331)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-28T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      notes: "Topics: Hashing, Prefix Sum, Two-Pointer, Subarrays, Linked List, Recursion",
    },
    {
      subject: "Applied Communication English (BTNX313)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-28T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      notes: "Topics: Accuracy in sentence structure, Language of Connection, Real-time Sessions",
    },
    {
      subject: "Backend Development (BTNX333)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-29T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 2",
      notes: "Topics: Intro to Backend, Cloud IDE, Express JS (Parts 1-3), REST APIs, Debugging",
    },
    {
      subject: "Fundamentals of Probability and Statistics (BTNX311)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-29T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 2",
      notes:
        "Topics: Probability in ML, Statistics & Datasets, Visualization, Central Tendency, Bayes Theorem",
    },
    {
      subject: "AI for Finance (BTNX314)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-30T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 3",
      notes: "Topics: Learning Journey, AI for Finance, Personal Finance Advisor, RAG Evaluation",
    },
    {
      subject: "Logical Reasoning (BTNX312)",
      examType: "IA-1",
      scheduledAt: new Date("2026-09-30T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 3",
      notes: "Topics: Linear & Circular Arrangements, Blood Relations 1 & 2",
    },
    {
      subject: "Yoga and Wellness (SVY301) - University Subject",
      examType: "IA-1",
      scheduledAt: new Date("2026-10-01T10:00:00.000Z"),
      durationMins: 60,
      venue: "S-VYASA Yoga & Wellness Center",
      notes: "S-VYASA University Foundation Exam in Yoga Philosophy & Practical Asanas",
    },

    // ── IA 2 (Nov 23 - Nov 25, 2026 - Tentative End of November) ──
    {
      subject: "Core Data Structure and Intermediate Algorithms (BTNX331)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-23T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      notes:
        "Tentative Date (End of Nov). Topics: Stacks, Monotonic Stacks, Queues, Binary Trees, BST, Heaps",
    },
    {
      subject: "Applied Communication English (BTNX313)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-23T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 1",
      notes:
        "Tentative Date (End of Nov). Topics: Self-Expression, Speech Accuracy, Natural Fluency, Balancing Ideas",
    },
    {
      subject: "Backend Development (BTNX333)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-24T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 2",
      notes:
        "Tentative Date (End of Nov). Topics: Authentication, File Systems, Streams, MongoDB, CRUD, JWT, RBAC",
    },
    {
      subject: "Fundamentals of Probability and Statistics (BTNX311)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-24T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 2",
      notes:
        "Tentative Date (End of Nov). Topics: Discrete/Continuous Distributions, Normal, Hypothesis Testing, Chi-Squared, ANOVA, Regression",
    },
    {
      subject: "AI for Finance (BTNX314)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-25T10:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 3",
      notes:
        "Tentative Date (End of Nov). Topics: Trading Agents (Parts 1 & 2), LLM Observability, LangSmith, Fraud Detection, AI Guardrails",
    },
    {
      subject: "Logical Reasoning (BTNX312)",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-25T14:00:00.000Z"),
      durationMins: 60,
      venue: "Main Academic Block - Exam Hall 3",
      notes:
        "Tentative Date (End of Nov). Topics: Syllogisms, Cubes, Puzzles, Data Sufficiency, Counting Figures, Visual Reasoning",
    },
    {
      subject: "Yoga and Wellness (SVY301) - University Subject",
      examType: "IA-2",
      scheduledAt: new Date("2026-11-26T10:00:00.000Z"),
      durationMins: 60,
      venue: "S-VYASA Yoga & Wellness Center",
      notes:
        "Tentative Date (End of Nov). S-VYASA University Foundation Exam in Pranayama, Stress Management & Meditation",
    },
  ];

  for (const exam of iaExamsData) {
    const created = await prisma.campusIaExam.create({
      data: {
        campusId,
        createdById,
        subject: exam.subject,
        examType: exam.examType,
        scheduledAt: exam.scheduledAt,
        durationMins: exam.durationMins,
        venue: exam.venue,
        notes: exam.notes,
      },
    });
    console.log(
      `  ✓ Added IA Exam: [${created.examType}] ${created.subject} on ${created.scheduledAt.toDateString()}`,
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 3. CIA SCHEDULES (from Academic Calendar)
  // ─────────────────────────────────────────────────────────────
  console.log("\n3. Seeding CIA Schedules...");

  await prisma.campusCiaSchedule.deleteMany({
    where: { campusId },
  });

  const ciaData = [
    {
      subject: "3rd Sem B.Tech CSE (All Subjects)",
      component: "CIA-1",
      scheduledAt: new Date("2026-09-07T18:00:00.000Z"),
      venue: "LMS Submission Portal",
      notes: "Freezing of Marks CIA – 1 (4 weeks from commencement)",
    },
    {
      subject: "3rd Sem B.Tech CSE (All Subjects)",
      component: "CIA-2",
      scheduledAt: new Date("2026-10-16T18:00:00.000Z"),
      venue: "LMS Submission Portal",
      notes: "Freezing of Marks CIA – 2 (10 weeks from commencement)",
    },
    {
      subject: "3rd Sem B.Tech CSE (All Subjects)",
      component: "CIA-3/P",
      scheduledAt: new Date("2026-12-04T18:00:00.000Z"),
      venue: "LMS Submission Portal",
      notes: "Freezing of Marks CIA – 3/P (16 weeks from commencement)",
    },
  ];

  for (const cia of ciaData) {
    const created = await prisma.campusCiaSchedule.create({
      data: {
        campusId,
        createdById,
        subject: cia.subject,
        component: cia.component,
        scheduledAt: cia.scheduledAt,
        venue: cia.venue,
        notes: cia.notes,
      },
    });
    console.log(`  ✓ Added CIA Schedule: [${created.component}] ${created.subject}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CAMPUS ACADEMIC CALENDAR 2026–2027 (from PDF 4)
  // ─────────────────────────────────────────────────────────────
  console.log("\n4. Seeding Academic Calendar 2026–2027 Events...");

  await prisma.campusCalendar.deleteMany({
    where: { campusId },
  });

  const calendarItems = [
    // ── Odd Semester 2026 ──
    {
      title: "Commencement of Odd Semester",
      description: "Commencement of classes for Odd Semester (2025 batch 3rd Sem)",
      eventDate: new Date("2026-08-10"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Independence Day",
      description: "Government Holiday",
      eventDate: new Date("2026-08-15"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Id-Milad",
      description: "Government Holiday",
      eventDate: new Date("2026-08-26"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Freezing of Marks CIA – 1",
      description: "4 weeks from commencement",
      eventDate: new Date("2026-09-07"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Ganesh Chaturthi",
      description: "Government Holiday",
      eventDate: new Date("2026-09-14"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Class Committee Meeting - 1",
      description: "3rd week September 2026 review",
      eventDate: new Date("2026-09-22"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Internal Assessment – 1 (IA 1)",
      description: "4th Week September 2026 - 3rd Sem Theory examinations",
      eventDate: new Date("2026-09-28"),
      endDate: new Date("2026-09-30"),
      eventType: "exam",
    },
    {
      title: "Gandhi Jayanthi",
      description: "Government Holiday",
      eventDate: new Date("2026-10-02"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Freezing of Marks IA – 1",
      description: "5 working days post IA-1",
      eventDate: new Date("2026-10-07"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Parent Teacher Meeting (UG)",
      description: "2nd week October 2026 parent interactions",
      eventDate: new Date("2026-10-09"),
      endDate: new Date("2026-10-10"),
      eventType: "academic",
    },
    {
      title: "Freezing of Marks CIA – 2",
      description: "10 weeks from commencement",
      eventDate: new Date("2026-10-16"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Mahanavami & Ayudha Pooja",
      description: "Government Holiday",
      eventDate: new Date("2026-10-20"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Vijayadashami",
      description: "Government Holiday",
      eventDate: new Date("2026-10-21"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Class Committee Meeting – 2",
      description: "5th Week October 2026 review",
      eventDate: new Date("2026-10-28"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Balipadyami / Deepavali",
      description: "Government Holiday",
      eventDate: new Date("2026-11-10"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Internal Assessment – 2 (IA 2)",
      description: "4th Week November 2026 - 3rd Sem Theory examinations (End of November)",
      eventDate: new Date("2026-11-23"),
      endDate: new Date("2026-11-25"),
      eventType: "exam",
    },
    {
      title: "Freezing of Marks IA – 2",
      description: "5 working days post IA-2",
      eventDate: new Date("2026-12-02"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Freezing of Marks CIA – 3/P",
      description: "16 weeks from commencement",
      eventDate: new Date("2026-12-04"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Semester End Practical Exams",
      description: "3rd Week December 2026 - Practical lab examinations",
      eventDate: new Date("2026-12-14"),
      endDate: new Date("2026-12-18"),
      eventType: "exam",
    },
    {
      title: "Announcement of Consolidated IA + CIA Marks",
      description: "Official publication of internal assessment aggregates",
      eventDate: new Date("2026-12-18"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Freezing of SEE Practical Marks",
      description: "Final submission of practical grades",
      eventDate: new Date("2026-12-19"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Last Instructional Day",
      description: "Last working day for Odd Semester classes",
      eventDate: new Date("2026-12-23"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Study Holidays",
      description: "Preparation study holidays before semester end exams",
      eventDate: new Date("2026-12-24"),
      endDate: new Date("2026-12-30"),
      eventType: "holiday",
    },
    {
      title: "Christmas Day",
      description: "Government Holiday",
      eventDate: new Date("2026-12-25"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Kalpatharu Day",
      description: "S-VYASA University Commemoration Day",
      eventDate: new Date("2027-01-01"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Commencement of Semester End Examination (SEE)",
      description: "Jan 2027 End Semester Examinations (Tentative)",
      eventDate: new Date("2027-01-06"),
      endDate: null,
      eventType: "exam",
    },
    {
      title: "Convocation",
      description: "2nd Week of January 2027",
      eventDate: new Date("2027-01-12"),
      endDate: null,
      eventType: "fest",
    },
    {
      title: "Makar Sankranti",
      description: "Government Holiday",
      eventDate: new Date("2027-01-15"),
      endDate: null,
      eventType: "holiday",
    },
    {
      title: "Republic Day",
      description: "Government Holiday",
      eventDate: new Date("2027-01-26"),
      endDate: null,
      eventType: "holiday",
    },

    // ── Even Semester 2027 ──
    {
      title: "Commencement of Even Semester (4th Sem)",
      description: "Classes commence for Even Semester (Tentative)",
      eventDate: new Date("2027-02-08"),
      endDate: null,
      eventType: "academic",
    },
    {
      title: "Internal Assessment – 1 (Even Sem)",
      description: "1st Week April 2027",
      eventDate: new Date("2027-03-29"),
      endDate: new Date("2027-03-31"),
      eventType: "exam",
    },
    {
      title: "Kala Vilas 2027",
      description: "Annual S-VYASA University Cultural & Arts Festival",
      eventDate: new Date("2027-05-17"),
      endDate: new Date("2027-05-21"),
      eventType: "fest",
    },
    {
      title: "Internal Assessment – 2 (Even Sem)",
      description: "2nd week June 2027",
      eventDate: new Date("2027-05-24"),
      endDate: new Date("2027-05-26"),
      eventType: "exam",
    },
    {
      title: "International Day of Yoga",
      description: "S-VYASA University Flagship Global Celebration",
      eventDate: new Date("2027-06-21"),
      endDate: null,
      eventType: "fest",
    },
    {
      title: "Commencement of Semester End Examination (SEE June 2027)",
      description: "4th Week of June 2027 (Tentative)",
      eventDate: new Date("2027-06-28"),
      endDate: null,
      eventType: "exam",
    },
  ];

  for (const item of calendarItems) {
    const created = await prisma.campusCalendar.create({
      data: {
        campusId,
        createdById,
        title: item.title,
        description: item.description,
        eventDate: item.eventDate,
        endDate: item.endDate,
        eventType: item.eventType,
        isPublic: true,
      },
    });
    console.log(
      `  ✓ Added Calendar Event: [${created.eventType}] ${created.title} (${created.eventDate.toISOString().split("T")[0]})`,
    );
  }

  console.log("\n✅ S-VYASA 3rd Sem (2025 Batch) Academic Data Successfully Seeded to Database!");
}

seedSvyasa3rdSem()
  .catch((e) => {
    console.error("Error seeding academic data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
