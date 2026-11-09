/**
 * scripts/seed-delta-v3.ts
 *
 * Seeds Plan Delta v3 Ecosystem:
 * 1. Inserts Student USNs and Faculty Employee IDs into institutional_roster
 * 2. Exercises the exact claim flow (Section 2) to provision studentAcademicDetails & facultyDetails
 * 3. Creates sample posts with audience targeting, anonymity, tags
 * 4. Seeds post engagement: likes (testing prioritized "liked by"), threaded comments, and views
 * 5. Seeds companies (with trigram duplicate prevention), projects, events, invites, and resources.
 */
import {
  PrismaClient,
  RosterRole,
  UserRole,
  PlatformEventMode,
  PlatformEventType,
  ResourceCategory,
  CompanyOwnerType,
} from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["DATABASE_URL"] ??
        "postgresql://stunet_owner:localdevonly@localhost:5434/stunet",
    },
  },
});

async function claimRosterUser(email: string, displayName: string, avatarUrl?: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const rosterEntry = await prisma.institutionalRoster.findUnique({
    where: { email: normalizedEmail },
    include: { campus: true },
  });

  if (!rosterEntry) {
    throw new Error(`Roster entry for ${normalizedEmail} not found!`);
  }

  const emailPrefix = normalizedEmail
    .split("@")[0]!
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20);
  let username = emailPrefix;
  let counter = 1;
  while (await prisma.userIdentity.findUnique({ where: { username } })) {
    username = `${emailPrefix.slice(0, 16)}_${counter++}`;
  }

  const role = rosterEntry.role as UserRole;

  // Clean existing details if re-seeding
  const existingPrivate = await prisma.userPrivateDetails.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingPrivate) {
    const existingUser = await prisma.userIdentity.findUnique({
      where: { id: existingPrivate.userId },
    });
    if (existingUser) {
      await prisma.postLike.deleteMany({ where: { userId: existingUser.id } });
      await prisma.postComment.deleteMany({ where: { userId: existingUser.id } });
      await prisma.postView.deleteMany({ where: { userId: existingUser.id } });
      await prisma.post.deleteMany({ where: { authorId: existingUser.id } });
      await prisma.studentAcademicDetails.deleteMany({ where: { userId: existingUser.id } });
      await prisma.facultyDetails.deleteMany({ where: { userId: existingUser.id } });
      await prisma.userPrivateDetails.deleteMany({ where: { userId: existingUser.id } });
      await prisma.userIdentity.delete({ where: { id: existingUser.id } });
    }
  }

  const identity = await prisma.userIdentity.create({
    data: {
      displayName,
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

  if (role === "STUDENT") {
    await prisma.studentAcademicDetails.create({
      data: {
        userId: identity.id,
        usn: rosterEntry.identifier,
        currentCourseYear: rosterEntry.currentCourseYear,
        joinedYear: rosterEntry.joinedYear,
        graduationYear: rosterEntry.graduationYear,
      },
    });
  } else if (role === "FACULTY") {
    await prisma.facultyDetails.create({
      data: {
        userId: identity.id,
        employeeId: rosterEntry.identifier,
      },
    });
  }

  await prisma.userPrivateDetails.create({
    data: {
      userId: identity.id,
      email: normalizedEmail,
    },
  });

  await prisma.institutionalRoster.update({
    where: { id: rosterEntry.id },
    data: { isClaimed: true },
  });

  return identity;
}

async function main() {
  console.log("🚀 Starting Plan Delta v3 Seeder...");

  // Find or create campus for testing
  let svyasa = await prisma.campus.findFirst({
    where: { OR: [{ slug: "svyasa-sas" }, { slug: "niat-chennai" }] },
  });

  if (!svyasa) {
    svyasa = await prisma.campus.create({
      data: {
        name: "S-VYASA SAS Deemed University",
        slug: "svyasa-sas",
        universityName: "Swami Vivekananda Yoga Anusandhana Samsthana",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        emailDomain: "svyasa-sas.edu.in",
        facilities: ["Research Labs", "Digital Library", "Campus Hostel", "Innovation Hub"],
      },
    });
  }

  // Find admin user for createdByAdminId
  let admin = await prisma.userIdentity.findFirst({
    where: { role: { in: ["CAMPUS_MANAGER", "SUPER_ADMIN"] } },
  });

  if (!admin) {
    admin = await prisma.userIdentity.create({
      data: {
        displayName: "Institutional Registrar",
        username: "campus_registrar",
        role: "CAMPUS_MANAGER",
        verificationStatus: "VERIFIED",
        campusId: svyasa.id,
        isActive: true,
      },
    });
  }

  console.log(`✓ Campus: ${svyasa.name} (${svyasa.id})`);
  console.log(`✓ Admin: ${admin.displayName} (${admin.id})`);

  // 1. Seed Institutional Roster
  console.log("\n📋 Seeding Institutional Roster rows (Plan Delta v3 Section 2)...");
  const rosterData = [
    {
      email: "rohan.student@svyasa-sas.edu.in",
      role: RosterRole.STUDENT,
      identifier: "2102508579",
      campusId: svyasa.id,
      currentCourseYear: 3,
      joinedYear: 2021,
      graduationYear: 2025,
    },
    {
      email: "dr.sharma.faculty@svyasa-sas.edu.in",
      role: RosterRole.FACULTY,
      identifier: "FAC-0492",
      campusId: svyasa.id,
      joinedYear: 2018,
    },
    {
      email: "priya.patel@svyasa-sas.edu.in",
      role: RosterRole.STUDENT,
      identifier: "2202508112",
      campusId: svyasa.id,
      currentCourseYear: 2,
      joinedYear: 2022,
      graduationYear: 2026,
    },
    {
      email: "prof.meera.faculty@svyasa-sas.edu.in",
      role: RosterRole.FACULTY,
      identifier: "FAC-0821",
      campusId: svyasa.id,
      joinedYear: 2015,
    },
    {
      email: "alumni.arun@svyasa-sas.edu.in",
      role: RosterRole.STUDENT,
      identifier: "1802508001",
      campusId: svyasa.id,
      currentCourseYear: 4,
      joinedYear: 2018,
      graduationYear: 2022,
    },
  ];

  for (const r of rosterData) {
    await prisma.institutionalRoster.upsert({
      where: { email: r.email },
      create: {
        ...r,
        isClaimed: false,
        createdByAdminId: admin.id,
      },
      update: {
        ...r,
      },
    });
  }
  console.log(`✓ Seeded ${rosterData.length} institutional roster rows.`);

  // 2. Claim accounts via official Section 2 claim flow
  console.log("\n🔑 Provisioning active demo accounts via Roster Claim Flow...");
  const rohan = await claimRosterUser(
    "rohan.student@svyasa-sas.edu.in",
    "Rohan Sharma",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  );
  console.log(`✓ Student: ${rohan.displayName} (@${rohan.username}) [USN: 2102508579]`);

  const drSharma = await claimRosterUser(
    "dr.sharma.faculty@svyasa-sas.edu.in",
    "Dr. R. K. Sharma",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  );
  console.log(`✓ Faculty: ${drSharma.displayName} (@${drSharma.username}) [EmpID: FAC-0492]`);

  const priya = await claimRosterUser(
    "priya.patel@svyasa-sas.edu.in",
    "Priya Patel",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  );
  console.log(`✓ Student: ${priya.displayName} (@${priya.username}) [USN: 2202508112]`);

  // Establish connection between Rohan and Dr. Sharma, and Rohan and Priya
  await prisma.connection.upsert({
    where: {
      senderId_receiverId: {
        senderId: rohan.id,
        receiverId: drSharma.id,
      },
    },
    create: {
      senderId: rohan.id,
      receiverId: drSharma.id,
      status: "ACCEPTED",
    },
    update: { status: "ACCEPTED" },
  });

  await prisma.connection.upsert({
    where: {
      senderId_receiverId: {
        senderId: rohan.id,
        receiverId: priya.id,
      },
    },
    create: {
      senderId: rohan.id,
      receiverId: priya.id,
      status: "ACCEPTED",
    },
    update: { status: "ACCEPTED" },
  });

  // 3. Seed Posts with Targeting, Anonymity, and Engagement
  console.log(
    "\n📝 Seeding Posts, Targeting, Anonymity & Engagement (Plan Delta v3 Section 5 & 6)...",
  );

  // Post 1: Faculty Research Post (Dr. Sharma)
  const facultyPost = await prisma.post.create({
    data: {
      authorId: drSharma.id,
      body: "Excited to announce our department's new Open Research Lab on Distributed Systems & Graph Analytics! We are inviting 3rd & 4th year student researchers to join our upcoming IEEE paper work.",
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      isAnonymous: false,
    },
  });

  // Post 2: Student Anonymous Query (Priya)
  const anonymousPost = await prisma.post.create({
    data: {
      authorId: priya.id,
      body: "Is anyone facing compiler errors with CUDA on the 4th floor lab machines? Trying to benchmark matrix multiplication for the CIA-2 submission.",
      visibility: "CAMPUS",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY"],
      isAnonymous: true,
    },
  });

  // Post 3: Student Connected Post (Rohan)
  const studentPost = await prisma.post.create({
    data: {
      authorId: rohan.id,
      body: "Our team just open-sourced 'StuNet-CLI' — a developer utility to inspect campus calendars and exam timetables right from the terminal! Check it out and let us know your feedback.",
      visibility: "PUBLIC",
      targetConnectionScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY", "ALUMNI"],
      isAnonymous: false,
    },
  });

  // Seed Likes on studentPost to test Instagram-style priority query:
  // Dr. Sharma (Connected Faculty) likes it -> top priority!
  await prisma.postLike.create({
    data: { postId: studentPost.id, userId: drSharma.id },
  });
  await prisma.postLike.create({
    data: { postId: studentPost.id, userId: priya.id },
  });

  // Seed Threaded Comments on studentPost
  const topComment = await prisma.postComment.create({
    data: {
      postId: studentPost.id,
      userId: drSharma.id,
      content:
        "Excellent initiative, Rohan. Ensure you submit this project for the upcoming Innovation Showcase.",
    },
  });

  // 1-Level reply to top comment
  await prisma.postComment.create({
    data: {
      postId: studentPost.id,
      userId: rohan.id,
      parentCommentId: topComment.id,
      content: "Thank you Dr. Sharma! We are preparing the documentation and slides this week.",
    },
  });

  // Seed Views on posts
  await prisma.postView.create({
    data: {
      postId: studentPost.id,
      userId: drSharma.id,
      viewCount: 3,
    },
  });
  await prisma.postView.create({
    data: {
      postId: studentPost.id,
      userId: priya.id,
      viewCount: 1,
    },
  });

  // 4. Seed Companies with Trigram support
  console.log("\n🏢 Seeding Companies & Founder Roles (Plan Delta v3 Section 4)...");
  const comp = await prisma.company.upsert({
    where: { normalizedName: "acme tech labs" },
    create: {
      name: "Acme Tech Labs",
      normalizedName: "acme tech labs",
      description: "Autonomous agentic infrastructure & campus tools.",
      websiteUrl: "https://acmelabs.example.com",
      createdByUserId: rohan.id,
    },
    update: {},
  });

  await prisma.userCompanyRole.upsert({
    where: {
      userId_companyId: {
        userId: rohan.id,
        companyId: comp.id,
      },
    },
    create: {
      userId: rohan.id,
      companyId: comp.id,
      ownerType: CompanyOwnerType.FOUNDER,
      position: "Co-Founder & Lead Engineer",
      showOnProfile: true,
    },
    update: {},
  });

  // 5. Seed Open Source Project
  console.log("💻 Seeding Open Source Projects...");
  await prisma.openSourceProject.create({
    data: {
      ownerUserId: rohan.id,
      name: "StuNet Core",
      description: "High performance campus-centric student community platform monorepo.",
      githubUrl: "https://github.com/JeevanRishiP/StuNet",
      syncedStars: 142,
      links: {
        create: [
          { name: "Documentation", url: "https://github.com/JeevanRishiP/StuNet#readme" },
          { name: "Live Demo", url: "http://localhost:3010" },
        ],
      },
    },
  });

  // 6. Seed Platform Event
  console.log("📅 Seeding Platform Events...");
  await prisma.platformEvent.create({
    data: {
      organizerUserId: drSharma.id,
      name: "National Inter-Campus AI Hackathon 2026",
      description: "48-hour national hackathon for building verified campus AI agents.",
      mode: PlatformEventMode.ONLINE,
      type: PlatformEventType.HACKATHON,
      eventDate: new Date(Date.now() + 86400000 * 20),
      registrationDeadline: new Date(Date.now() + 86400000 * 15),
    },
  });

  // 7. Seed Professional Invite (Connections-Only)
  console.log("🤝 Seeding Professional Invite (Connections-Only)...");
  await prisma.professionalInvite.create({
    data: {
      creatorUserId: rohan.id,
      name: "Looking for UI/UX Designer for Hackathon Team",
      description:
        "Building an accessibility dashboard for campus students. Looking for 1 designer familiar with Figma and Tailwind.",
      mode: "ONLINE",
      type: "HACKATHON_TEAM",
      requirements:
        "Figma proficiency, Tailwind CSS understanding, enthusiastic about student tools.",
      eventDate: new Date(Date.now() + 86400000 * 12),
      expiresAt: new Date(Date.now() + 86400000 * 10),
    },
  });

  // 8. Seed Useful Resource
  console.log("📚 Seeding Useful Resources...");
  await prisma.usefulResource.create({
    data: {
      createdByUserId: drSharma.id,
      title: "MIT Distributed Systems 6.824 Lecture Notes & Lab Implementations",
      category: ResourceCategory.RESEARCH_PAPER,
      url: "https://pdos.csail.mit.edu/6.824/",
      description:
        "Recommended reading for all systems researchers and distributed compute students.",
    },
  });

  // 9. Seed Profile Links
  console.log("🔗 Seeding Profile Links (Linktree style)...");
  await prisma.profileLink.upsert({
    where: {
      userId_platform: {
        userId: rohan.id,
        platform: "GITHUB",
      },
    },
    create: {
      userId: rohan.id,
      platform: "GITHUB",
      url: "https://github.com/rohansharma",
    },
    update: { url: "https://github.com/rohansharma" },
  });

  await prisma.profileLink.upsert({
    where: {
      userId_platform: {
        userId: rohan.id,
        platform: "LEETCODE",
      },
    },
    create: {
      userId: rohan.id,
      platform: "LEETCODE",
      url: "https://leetcode.com/rohansharma",
    },
    update: { url: "https://leetcode.com/rohansharma" },
  });

  console.log("\n============================================================");
  console.log("✅ Plan Delta v3 Ecosystem Seeded Successfully!");
  console.log("============================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
