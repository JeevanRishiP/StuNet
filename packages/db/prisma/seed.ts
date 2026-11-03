// ============================================================
// StuNet Seed Script — All 41 NIAT Campuses, 7 Clubs Each,
// Faculties, Leadership Roster, Test Users, and Connections
// Run via: pnpm --filter @stunet/db db:seed
// ============================================================
import { PrismaClient, UserRole, VerificationStatus, ClubMemberRole } from "@prisma/client";
import { CAMPUSES_DATA, OFFICIAL_CLUBS, CLUB_CORE_ROLES } from "./campus-data";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["DATABASE_URL"] ??
        "postgresql://stunet_owner:localdevonly@localhost:5434/stunet",
    },
  },
});

async function main(): Promise<void> {
  console.log("🌱 Seeding StuNet database with all 41 Campuses and Ecosystem...");

  // 1. Seed or Upsert Legacy Primary Campuses for backward compatibility
  const legacyChennai = await prisma.campus.upsert({
    where: { slug: "niat-chennai" },
    update: {
      name: "NIAT Chennai Central",
      universityName: "NIAT Consortium Chennai",
      city: "Chennai",
      state: "Tamil Nadu",
      facilities: ["AI & Systems Lab", "Hostel", "Transport", "Innovation Sandbox"],
    },
    create: {
      name: "NIAT Chennai Central",
      slug: "niat-chennai",
      universityName: "NIAT Consortium Chennai",
      emailDomain: "niat.edu.in",
      city: "Chennai",
      state: "Tamil Nadu",
      websiteUrl: "https://www.niatindia.com/campus",
      facilities: ["AI & Systems Lab", "Hostel", "Transport", "Innovation Sandbox"],
    },
  });

  const legacyHyd = await prisma.campus.upsert({
    where: { slug: "niat-hyderabad" },
    update: {
      name: "NIAT Hyderabad Central",
      universityName: "NIAT Consortium Hyderabad",
      city: "Hyderabad",
      state: "Telangana",
      facilities: ["Center of Excellence in AI", "Incubation Hub", "Hostel", "Transport"],
    },
    create: {
      name: "NIAT Hyderabad Central",
      slug: "niat-hyderabad",
      universityName: "NIAT Consortium Hyderabad",
      emailDomain: "hyd.niat.edu.in",
      city: "Hyderabad",
      state: "Telangana",
      websiteUrl: "https://www.niatindia.com/campus",
      facilities: ["Center of Excellence in AI", "Incubation Hub", "Hostel", "Transport"],
    },
  });

  // 2. Seed All 41 Official NIAT Campuses
  console.log(`\n🏫 Upserting ${CAMPUSES_DATA.length} Official NIAT Partner Campuses...`);
  const campusRecords: Record<string, string> = {
    "niat-chennai": legacyChennai.id,
    "niat-hyderabad": legacyHyd.id,
  };

  for (const c of CAMPUSES_DATA) {
    const record = await prisma.campus.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        universityName: c.universityName,
        city: c.city,
        state: c.state,
        emailDomain: c.emailDomain,
        websiteUrl: c.websiteUrl,
        address: c.address,
        facilities: c.facilities,
        isActive: true,
      },
      create: {
        slug: c.slug,
        name: c.name,
        universityName: c.universityName,
        city: c.city,
        state: c.state,
        emailDomain: c.emailDomain,
        websiteUrl: c.websiteUrl,
        address: c.address,
        facilities: c.facilities,
        isActive: true,
      },
    });
    campusRecords[c.slug] = record.id;
  }
  console.log(`✓ All ${CAMPUSES_DATA.length} Campuses Seeded!`);

  // 3. For EACH Campus: Ensure all 7 Official Clubs exist!
  console.log("\n🏛️  Initializing 7 Official NIAT Clubs for EVERY campus...");
  let totalClubsSeeded = 0;
  const allCampusIds = Object.values(campusRecords);

  for (const campusId of allCampusIds) {
    for (const club of OFFICIAL_CLUBS) {
      await prisma.club.upsert({
        where: {
          campusId_slug: {
            campusId,
            slug: club.slug,
          },
        },
        update: {
          name: club.name,
          category: club.category,
          description: club.description,
          instagramUrl: club.instagramUrl,
          isActive: true,
        },
        create: {
          campusId,
          slug: club.slug,
          name: club.name,
          category: club.category,
          description: club.description,
          instagramUrl: club.instagramUrl,
          institutionalEmail: `${club.slug}@niat.edu.in`,
          isActive: true,
        },
      });
      totalClubsSeeded++;
    }
  }
  console.log(
    `✓ Seeded ${totalClubsSeeded} clubs (${OFFICIAL_CLUBS.length} clubs across ${allCampusIds.length} campuses)!`,
  );

  // 4. Seed Faculties for Campuses
  console.log("\n👨‍🏫 Seeding Campus Faculties & Mentors...");
  const facultyTemplates = [
    {
      name: "Dr. K. S. Ramanathan",
      designation: "Professor & Head of Department",
      department: "Computer Science & Engineering",
      email: "hod.cse@niat.edu.in",
      phone: "+91 98401 23456",
      officeRoom: "Tech Block A - Room 302",
    },
    {
      name: "Dr. Meera Vasudevan",
      designation: "Associate Professor & Lead AI Researcher",
      department: "Artificial Intelligence & Data Science",
      email: "meera.ai@niat.edu.in",
      phone: "+91 98402 34567",
      officeRoom: "Innovation Hub - Room 104",
    },
    {
      name: "Prof. Arvind Swaminathan",
      designation: "Assistant Professor & Industry Mentor",
      department: "Computer Science & Cloud Systems",
      email: "arvind.cloud@niat.edu.in",
      phone: "+91 98403 45678",
      officeRoom: "Coding Lab Block B - Room 201",
    },
    {
      name: "Dr. Shalini Reddy",
      designation: "Dean of Student Welfare & Clubs Mentor",
      department: "Student Affairs & Innovation",
      email: "shalini.welfare@niat.edu.in",
      phone: "+91 98404 56789",
      officeRoom: "Student Affairs Office - Ground Floor",
    },
  ];

  for (const campusId of allCampusIds.slice(0, 10)) {
    for (const f of facultyTemplates) {
      await prisma.campusFaculty.create({
        data: {
          campusId,
          name: f.name,
          designation: f.designation,
          department: f.department,
          email: f.email,
          phone: f.phone,
          officeRoom: f.officeRoom,
          isActive: true,
        },
      });
    }
  }
  console.log("✓ Sample Faculties Seeded across campuses!");

  // 5. Seed Core Test Users (Students & Admins)
  console.log("\n👤 Seeding Test Users & Institutional Identities...");
  const alice = await prisma.userIdentity.upsert({
    where: { username: "alice_dev" },
    update: {
      campusId: legacyChennai.id,
    },
    create: {
      campusId: legacyChennai.id,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Alice Nair",
      username: "alice_dev",
      bio: "CS '26 | Codeforces Specialist | Open source contributor",
      headline: "Competitive Programmer @ NIAT",
    },
  });

  const bob = await prisma.userIdentity.upsert({
    where: { username: "bob_designs" },
    update: {
      campusId: legacyChennai.id,
    },
    create: {
      campusId: legacyChennai.id,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Bob Krishnan",
      username: "bob_designs",
      bio: "Design enthusiast | Figma | Motion graphics",
      headline: "Design Guild President",
    },
  });

  const carol = await prisma.userIdentity.upsert({
    where: { username: "carol_admin" },
    update: {
      campusId: legacyChennai.id,
      managedCampusId: legacyChennai.id,
    },
    create: {
      campusId: legacyChennai.id,
      managedCampusId: legacyChennai.id,
      role: UserRole.CAMPUS_MANAGER,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Carol Sharma",
      username: "carol_admin",
      headline: "Campus Manager — NIAT Chennai",
    },
  });

  const dave = await prisma.userIdentity.upsert({
    where: { username: "dave_ml" },
    update: {
      campusId: legacyHyd.id,
    },
    create: {
      campusId: legacyHyd.id,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Dave Patel",
      username: "dave_ml",
      bio: "AI/ML researcher | Kaggle Expert",
      headline: "AI & ML Club Lead",
    },
  });

  const superAdmin = await prisma.userIdentity.upsert({
    where: { username: "stunet_super" },
    update: {},
    create: {
      role: UserRole.SUPER_ADMIN,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "StuNet Super Admin",
      username: "stunet_super",
    },
  });

  console.log(
    `✓ Users: alice_dev, bob_designs, carol_admin (Campus Manager), dave_ml, stunet_super`,
  );

  // 6. Assign Club Leadership Core Members (President, VP, etc.)
  console.log("\n⭐ Assigning Club Core Roles...");
  const chennaiNsgc = await prisma.club.findFirst({
    where: { campusId: legacyChennai.id, slug: "nsgc" },
  });

  if (chennaiNsgc) {
    await prisma.clubMember.upsert({
      where: {
        clubId_userId: {
          clubId: chennaiNsgc.id,
          userId: alice.id,
        },
      },
      update: { role: ClubMemberRole.PRESIDENT },
      create: {
        clubId: chennaiNsgc.id,
        userId: alice.id,
        role: ClubMemberRole.PRESIDENT,
      },
    });

    await prisma.clubMember.upsert({
      where: {
        clubId_userId: {
          clubId: chennaiNsgc.id,
          userId: bob.id,
        },
      },
      update: { role: ClubMemberRole.VICE_PRESIDENT },
      create: {
        clubId: chennaiNsgc.id,
        userId: bob.id,
        role: ClubMemberRole.VICE_PRESIDENT,
      },
    });

    await prisma.clubRoleAssignment.create({
      data: {
        clubId: chennaiNsgc.id,
        userId: alice.id,
        role: ClubMemberRole.PRESIDENT,
        assignedById: carol.id,
      },
    });
  }

  // 7. Seed Sample Academic Data (CIA 1-3, IA 1-2, Live Alerts)
  console.log("\n📅 Seeding Academic CIA, IA, and Live Announcements...");
  await prisma.campusLiveAlert.create({
    data: {
      campusId: legacyChennai.id,
      createdById: carol.id,
      title: "CIA 2 English - Submission Date Extended by 1 day",
      body: "The final deadline for English Technical Writing has been extended to November 8th, 11:59 PM.",
      severity: "INFO",
    },
  });

  await prisma.campusCiaSchedule.create({
    data: {
      campusId: legacyChennai.id,
      createdById: carol.id,
      subject: "Data Structures & Algorithms",
      component: "CIA 1",
      scheduledAt: new Date(Date.now() + 86400000 * 3),
      venue: "Computer Lab 4",
      notes: "Topics: Binary Search Trees, AVL Trees, Dynamic Programming",
    },
  });

  await prisma.campusCiaSchedule.create({
    data: {
      campusId: legacyChennai.id,
      createdById: carol.id,
      subject: "Web Architectures & Cloud",
      component: "CIA 2",
      scheduledAt: new Date(Date.now() + 86400000 * 7),
      venue: "Online Submission via StuNet",
      notes: "Topics: RESTful API design, Next.js routing, Database indexing",
    },
  });

  await prisma.campusIaExam.create({
    data: {
      campusId: legacyChennai.id,
      createdById: carol.id,
      subject: "Machine Learning & Deep Learning",
      examType: "IA 1",
      scheduledAt: new Date(Date.now() + 86400000 * 14),
      durationMins: 90,
      venue: "Main Examination Hall A",
      syllabusUrl: "https://niat.edu.in/syllabus/ia1-ml.pdf",
      notes: "Syllabus, Timetable, and Question Bank available",
    },
  });

  console.log("\n============================================================");
  console.log("✅ Seed Complete!");
  console.log(`   Total Campuses: ${allCampusIds.length}`);
  console.log(`   Clubs per Campus: ${OFFICIAL_CLUBS.length} (Total: ${totalClubsSeeded})`);
  console.log(`   Core Roles: ${CLUB_CORE_ROLES.join(", ")}`);
  console.log("============================================================\n");
}

main()
  .catch((err: unknown) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
