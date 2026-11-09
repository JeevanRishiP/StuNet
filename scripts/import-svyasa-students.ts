import fs from "fs";
import path from "path";
import argon2 from "argon2";
import {
  PrismaClient,
  RosterRole,
  UserRole,
  VerificationStatus,
  ClubMemberRole,
} from "@prisma/client";

const prisma = new PrismaClient();

// Helper to format names nicely
function formatName(raw: string): string {
  const trimmed = raw.trim();
  // If it's all uppercase, convert to Title Case
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    return trimmed
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return trimmed;
}

const OFFICIAL_CLUBS = [
  {
    slug: "nsgc",
    name: "NxtWave Student General Council (NSGC)",
    category: "Governance & Leadership",
    description:
      "The apex student governance body fostering student leadership, policy advocacy, inter-campus coordination, and student welfare.",
    institutionalEmail: "nsgc@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_nsgc",
  },
  {
    slug: "advanced-tech",
    name: "Advanced Tech Club",
    category: "Technology",
    description:
      "High-performance computing, systems engineering, distributed architecture, and deep-tech hackathon development.",
    institutionalEmail: "advanced-tech@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_advancedtech",
  },
  {
    slug: "arts",
    name: "Arts Club",
    category: "Cultural & Creative",
    description:
      "Visual arts, digital sketching, motion graphics, UI/UX storytelling, and campus cultural exhibitions.",
    institutionalEmail: "arts@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_artsclub",
  },
  {
    slug: "sports",
    name: "Sports Club",
    category: "Athletics & Fitness",
    description:
      "Inter-campus tournaments, athletics, esports leagues, and physical wellness initiatives across NIAT campuses.",
    institutionalEmail: "sports@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_sportsclub",
  },
  {
    slug: "edu",
    name: "EDU Club (Entrepreneurship & VC)",
    category: "Entrepreneurship",
    description:
      "Student venture incubation, founder pitches, angel/VC connect, BRAVE 1.0/2.0 challenges, and startup mentorship.",
    institutionalEmail: "edu@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_educlub",
  },
  {
    slug: "gen-ai",
    name: "Gen AI Club",
    category: "Artificial Intelligence",
    description:
      "Generative AI, Large Language Models, agentic coding workflows, multimodal research, and AI hackathons.",
    institutionalEmail: "gen-ai@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_genai",
  },
  {
    slug: "media",
    name: "Media Club",
    category: "Media & Journalism",
    description:
      "Campus podcasting, tech journalism, event coverage, photography, videography, and NIAT Insider contributions.",
    institutionalEmail: "media@svyasa-sas.edu.in",
    instagramUrl: "https://instagram.com/niat_mediaclub",
  },
];

async function main() {
  console.log("🏫 Importing SVYASA University 2025 Students & Club Presidents...");

  // 1. Locate SVYASA Campus
  let campus = await prisma.campus.findFirst({
    where: {
      OR: [
        { slug: "niat-s-vyasa-bangalore" },
        { slug: "svyasa-sas" },
        { name: { contains: "S-VYASA", mode: "insensitive" } },
      ],
    },
  });

  if (!campus) {
    campus = await prisma.campus.create({
      data: {
        name: "S-VYASA University School of Advanced Studies",
        universityName: "S-VYASA (Deemed to be University)",
        slug: "niat-s-vyasa-bangalore",
        emailDomain: "svyasa-sas.edu.in",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        address: "Prashanti Kutiram, Gundanahalli, Anekal, Bengaluru, Karnataka 560105",
        facilities: [
          "Advanced Research Lab",
          "Yoga & Wellness Center",
          "Hostel",
          "Transport",
          "Innovation Sandbox",
        ],
      },
    });
    console.log(`Created new SVYASA campus: ${campus.id}`);
  } else {
    // Update email domain to svyasa-sas.edu.in to match student emails
    campus = await prisma.campus.update({
      where: { id: campus.id },
      data: {
        emailDomain: "svyasa-sas.edu.in",
      },
    });
    console.log(`✓ Using campus: ${campus.name} (ID: ${campus.id}, Domain: ${campus.emailDomain})`);
  }

  // 2. Ensure all 7 official clubs exist for this campus
  console.log("\n🏛️  Ensuring 7 Campus Clubs exist for SVYASA...");
  const clubMap = new Map<string, string>(); // slug -> clubId
  for (const c of OFFICIAL_CLUBS) {
    let club = await prisma.club.findFirst({
      where: {
        campusId: campus.id,
        slug: c.slug,
      },
    });

    if (!club) {
      club = await prisma.club.create({
        data: {
          campusId: campus.id,
          name: c.name,
          slug: c.slug,
          category: c.category,
          description: c.description,
          institutionalEmail: c.institutionalEmail,
          instagramUrl: c.instagramUrl,
          isActive: true,
        },
      });
      console.log(`  + Created club: ${c.name} (${c.slug})`);
    } else {
      console.log(`  ✓ Found club: ${club.name} (${club.slug})`);
    }
    clubMap.set(c.slug, club.id);
  }

  // 3. Ensure Campus Batch for 2025 exists
  const batch = await prisma.campusBatch.upsert({
    where: {
      campusId_year: {
        campusId: campus.id,
        year: 2025,
      },
    },
    create: {
      campusId: campus.id,
      year: 2025,
      degree: "B.Tech Computer Science & AI",
      numberOfStudents: 181,
      numberOfSections: 3,
      successCoachName: "Dr. R. K. Sharma",
      successCoachEmployeeId: "FAC-0492",
    },
    update: {
      numberOfStudents: 181,
      degree: "B.Tech Computer Science & AI",
    },
  });
  console.log(
    `\n🎓 Campus Batch 2025 synced: ${batch.degree} (${batch.numberOfStudents} students)`,
  );

  // 4. Ensure an Admin user exists for institutional audit tracking
  let admin = await prisma.userIdentity.findFirst({
    where: {
      campusId: campus.id,
      role: { in: [UserRole.CAMPUS_MANAGER, UserRole.SUPER_ADMIN] },
    },
  });

  if (!admin) {
    admin = await prisma.userIdentity.create({
      data: {
        campusId: campus.id,
        managedCampusId: campus.id,
        displayName: "Institutional Registrar",
        username: "svyasa_registrar",
        role: UserRole.CAMPUS_MANAGER,
        verificationStatus: VerificationStatus.VERIFIED,
        isActive: true,
      },
    });
  }

  // 5. Read CSV
  const csvPath = path.join(__dirname, "svyasa-students-2025.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const header = lines[0];
  const rows = lines.slice(1);

  console.log(`\n👥 Processing ${rows.length} students from CSV...`);

  const defaultPasswordHash = await argon2.hash("Svyasa@2025");

  let createdCount = 0;
  let updatedCount = 0;
  const presidentAssignments: Array<{
    usn: string;
    studentName: string;
    email: string;
    clubSlug: string;
    userId: string;
  }> = [];

  for (const row of rows) {
    const parts = row.split(",").map((p) => p.trim());
    if (parts.length < 5) continue;

    const usn = parts[0];
    const rawName = parts[1];
    const email = parts[2].toLowerCase();
    const joinedYear = parseInt(parts[3], 10) || 2025;
    const clubPresidentRole = parts[4]; // "NA", "NSGC", "Entrepreneurship club", "Advance tech club", "Gen AI club", "Media club"

    const formattedName = formatName(rawName);

    // Map club president string to club slug
    let presidentClubSlug: string | null = null;
    if (clubPresidentRole !== "NA") {
      const lowerRole = clubPresidentRole.toLowerCase();
      if (lowerRole.includes("nsgc")) {
        presidentClubSlug = "nsgc";
      } else if (lowerRole.includes("entrepreneurship") || lowerRole.includes("edu")) {
        presidentClubSlug = "edu";
      } else if (lowerRole.includes("advance") || lowerRole.includes("tech")) {
        presidentClubSlug = "advanced-tech";
      } else if (lowerRole.includes("gen ai") || lowerRole.includes("ai")) {
        presidentClubSlug = "gen-ai";
      } else if (lowerRole.includes("media")) {
        presidentClubSlug = "media";
      }
    }

    // 5a. Upsert Institutional Roster entry
    await prisma.institutionalRoster.upsert({
      where: { email },
      create: {
        email,
        role: RosterRole.STUDENT,
        identifier: usn,
        campusId: campus.id,
        currentCourseYear: 1,
        joinedYear,
        graduationYear: joinedYear + 4,
        isClaimed: true,
        createdByAdminId: admin.id,
      },
      update: {
        identifier: usn,
        campusId: campus.id,
        currentCourseYear: 1,
        joinedYear,
        graduationYear: joinedYear + 4,
        isClaimed: true,
      },
    });

    // 5b. Check if User Identity exists (by USN username, or through private details email)
    let user = await prisma.userIdentity.findFirst({
      where: {
        OR: [{ username: usn }, { studentAcademicDetails: { usn } }],
      },
      include: {
        studentAcademicDetails: true,
      },
    });

    // Also check via private details
    if (!user) {
      const priv = await prisma.userPrivateDetails.findUnique({
        where: { email },
      });
      if (priv) {
        user = await prisma.userIdentity.findUnique({
          where: { id: priv.userId },
          include: { studentAcademicDetails: true },
        });
      }
    }

    const clubObj = presidentClubSlug
      ? OFFICIAL_CLUBS.find((c) => c.slug === presidentClubSlug)
      : null;
    const headline = clubObj ? `President · ${clubObj.name}` : `Student · ${campus.name}`;

    if (!user) {
      // Create user
      user = await prisma.userIdentity.create({
        data: {
          campusId: campus.id,
          displayName: formattedName,
          username: usn,
          role: clubObj ? UserRole.CLUB_MANAGER : UserRole.STUDENT,
          verificationStatus: VerificationStatus.VERIFIED,
          joiningYear: joinedYear,
          headline,
          isActive: true,
          isBanned: false,
          studentAcademicDetails: {
            create: {
              usn,
              currentCourseYear: 1,
              joinedYear,
              graduationYear: joinedYear + 4,
            },
          },
        },
        include: {
          studentAcademicDetails: true,
        },
      });

      // UserPrivateDetails
      await prisma.userPrivateDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          email,
        },
        update: {
          email,
        },
      });

      // AuthCredential
      await prisma.authCredential.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          passwordHash: defaultPasswordHash,
        },
        update: {},
      });

      createdCount++;
    } else {
      // Update existing user
      await prisma.userIdentity.update({
        where: { id: user.id },
        data: {
          campusId: campus.id,
          displayName: formattedName,
          joiningYear: joinedYear,
          role: clubObj ? UserRole.CLUB_MANAGER : user.role,
          headline: clubObj ? headline : user.headline || headline,
          verificationStatus: VerificationStatus.VERIFIED,
          isActive: true,
        },
      });

      // Ensure Academic details
      await prisma.studentAcademicDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          usn,
          currentCourseYear: 1,
          joinedYear,
          graduationYear: joinedYear + 4,
        },
        update: {
          usn,
          currentCourseYear: 1,
          joinedYear,
          graduationYear: joinedYear + 4,
        },
      });

      // Ensure Private details
      await prisma.userPrivateDetails.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          email,
        },
        update: {
          email,
        },
      });

      // Ensure auth credential
      await prisma.authCredential.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          passwordHash: defaultPasswordHash,
        },
        update: {},
      });

      updatedCount++;
    }

    if (presidentClubSlug) {
      presidentAssignments.push({
        usn,
        studentName: formattedName,
        email,
        clubSlug: presidentClubSlug,
        userId: user.id,
      });
    }
  }

  console.log(`\n✅ Student Users Synced: ${createdCount} created, ${updatedCount} updated.`);

  // 6. Assign Club Presidents
  console.log("\n🎖️  Assigning 5 Club Presidents for 2025 Students...");
  for (const pres of presidentAssignments) {
    const clubId = clubMap.get(pres.clubSlug);
    if (!clubId) {
      console.warn(`Club ID not found for slug ${pres.clubSlug}`);
      continue;
    }

    const clubMeta = OFFICIAL_CLUBS.find((c) => c.slug === pres.clubSlug);

    // Upsert ClubMember as PRESIDENT
    await prisma.clubMember.upsert({
      where: {
        clubId_userId: {
          clubId,
          userId: pres.userId,
        },
      },
      create: {
        clubId,
        userId: pres.userId,
        role: ClubMemberRole.PRESIDENT,
        isActive: true,
      },
      update: {
        role: ClubMemberRole.PRESIDENT,
        isActive: true,
      },
    });

    // Record in ClubRoleAssignment history
    await prisma.clubRoleAssignment.create({
      data: {
        clubId,
        userId: pres.userId,
        role: ClubMemberRole.PRESIDENT,
        assignedById: admin.id,
      },
    });

    console.log(
      `  👑 ${clubMeta?.name}: ${pres.studentName} (USN: ${pres.usn}, Email: ${pres.email})`,
    );
  }

  // 7. Verify Club Counts and Presidents
  console.log("\n📊 Verification of SVYASA Campus Setup:");
  const clubsInDb = await prisma.club.findMany({
    where: { campusId: campus.id },
    include: {
      members: {
        where: { role: ClubMemberRole.PRESIDENT },
        include: { user: true },
      },
    },
  });

  for (const c of clubsInDb) {
    const president = c.members[0]?.user;
    if (president) {
      console.log(
        `  ✓ [${c.slug}] ${c.name} -> President: ${president.displayName} (@${president.username})`,
      );
    } else {
      console.log(
        `  ⏳ [${c.slug}] ${c.name} -> President: [Reserved for 2026 First Year Students]`,
      );
    }
  }

  const totalRoster = await prisma.institutionalRoster.count({
    where: { campusId: campus.id },
  });
  const totalStudents = await prisma.userIdentity.count({
    where: { campusId: campus.id, role: { in: [UserRole.STUDENT, UserRole.CLUB_MANAGER] } },
  });

  console.log(`\n🎉 SVYASA Import Complete!`);
  console.log(`  - Total Campus Roster Entries: ${totalRoster}`);
  console.log(`  - Total Active Student Accounts: ${totalStudents}`);
}

main()
  .catch((e) => {
    console.error("Error importing students:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
