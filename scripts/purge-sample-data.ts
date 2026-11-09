import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Starting Sample Data Purge ---");

  // 1. Read real CSV USNs
  const csvPath = path.resolve(__dirname, "svyasa-students-2025.csv");
  const csvText = fs.readFileSync(csvPath, "utf8");
  const lines = csvText
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .slice(1);
  const csvUsns = new Set(lines.map((l) => l.split(",")[0].trim()));
  console.log(`Loaded ${csvUsns.size} verified student USNs from CSV.`);

  // 2. Identify users to delete
  const allUsers = await prisma.userIdentity.findMany({
    select: { id: true, username: true, displayName: true, role: true },
  });

  const toDelete = allUsers.filter(
    (u) => u.username !== "stunet_super" && !csvUsns.has(u.username),
  );
  const toDeleteIds = toDelete.map((u) => u.id);

  console.log(`Identified ${toDelete.length} sample users to delete:`);
  for (const u of toDelete) {
    console.log(`  - [${u.role}] ${u.displayName} (@${u.username}) -> ID: ${u.id}`);
  }

  if (toDeleteIds.length > 0) {
    // Delete social graph & references
    await prisma.connection.deleteMany({
      where: {
        OR: [{ senderId: { in: toDeleteIds } }, { receiverId: { in: toDeleteIds } }],
      },
    });

    await prisma.userBlock.deleteMany({
      where: {
        OR: [{ initiatorId: { in: toDeleteIds } }, { targetId: { in: toDeleteIds } }],
      },
    });

    await prisma.groupJoinRequest.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.notification.deleteMany({
      where: {
        OR: [{ recipientId: { in: toDeleteIds } }, { triggeredById: { in: toDeleteIds } }],
      },
    });

    await prisma.notificationPreference.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.report.deleteMany({
      where: {
        OR: [{ submitterId: { in: toDeleteIds } }, { reportedUserId: { in: toDeleteIds } }],
      },
    });

    await prisma.adminAuditLog.deleteMany({
      where: { adminId: { in: toDeleteIds } },
    });

    await prisma.pollEntry.deleteMany({
      where: { creatorId: { in: toDeleteIds } },
    });

    await prisma.postComment.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.comment.deleteMany({
      where: { authorId: { in: toDeleteIds } },
    });

    await prisma.postLike.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.postView.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.post.deleteMany({
      where: { authorId: { in: toDeleteIds } },
    });

    await prisma.clubMember.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.clubRoleAssignment.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.groupMember.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.group.deleteMany({
      where: { ownerId: { in: toDeleteIds } },
    });

    await prisma.achievement.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.campusMarketListing.deleteMany({
      where: { sellerId: { in: toDeleteIds } },
    });

    await prisma.profileLink.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.userCompanyRole.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.openSourceProject.deleteMany({
      where: { ownerUserId: { in: toDeleteIds } },
    });

    await prisma.platformEvent.deleteMany({
      where: { organizerUserId: { in: toDeleteIds } },
    });

    await prisma.professionalInvite.deleteMany({
      where: { creatorUserId: { in: toDeleteIds } },
    });

    await prisma.usefulResource.deleteMany({
      where: { createdByUserId: { in: toDeleteIds } },
    });

    await prisma.studentAcademicDetails.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.facultyDetails.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.alumniDetails.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.authSession.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.authCredential.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.userPrivateDetails.deleteMany({
      where: { userId: { in: toDeleteIds } },
    });

    await prisma.userIdentity.deleteMany({
      where: { id: { in: toDeleteIds } },
    });

    console.log(
      `Successfully deleted ${toDeleteIds.length} sample users and all their dependencies.`,
    );
  }

  // 3. Purge all 41 mock faculties
  const deletedFaculties = await prisma.campusFaculty.deleteMany();
  console.log(`Deleted ${deletedFaculties.count} mock campus faculties.`);

  // 4. Purge mock roster entries
  const deletedRoster = await prisma.institutionalRoster.deleteMany({
    where: {
      OR: [
        { email: { contains: "prof.meera.faculty" } },
        { email: { contains: "alumni.arun" } },
        { email: { contains: "dr.sharma.faculty" } },
        { email: { contains: "priya.patel" } },
        { email: { contains: "satyaaparnag" } },
      ],
    },
  });
  console.log(`Deleted ${deletedRoster.count} mock institutional roster entries.`);

  // 5. Clean up duplicate ClubRoleAssignments for the 5 real S-VYASA presidents
  const roleAssignments = await prisma.clubRoleAssignment.findMany({
    where: { role: "PRESIDENT" },
    orderBy: { createdAt: "asc" },
  });

  const seenClubPresident = new Set<string>();
  const dupRoleIds: string[] = [];

  for (const ra of roleAssignments) {
    const key = `${ra.clubId}_${ra.userId}`;
    if (seenClubPresident.has(key)) {
      dupRoleIds.push(ra.id);
    } else {
      seenClubPresident.add(key);
    }
  }

  if (dupRoleIds.length > 0) {
    await prisma.clubRoleAssignment.deleteMany({
      where: { id: { in: dupRoleIds } },
    });
    console.log(`Removed ${dupRoleIds.length} duplicate president role assignments.`);
  }

  // 6. Delete dev seed test campuses
  const testCampuses = await prisma.campus.findMany({
    where: { name: { contains: "__dev_seeded__" } },
    select: { id: true, name: true },
  });

  for (const tc of testCampuses) {
    await prisma.club.deleteMany({ where: { campusId: tc.id } });
    await prisma.campus.delete({ where: { id: tc.id } });
    console.log(`Deleted test campus: ${tc.name} (${tc.id})`);
  }

  // 7. Verify counts
  const finalUsers = await prisma.userIdentity.count();
  const finalFaculties = await prisma.campusFaculty.count();
  const finalRosters = await prisma.institutionalRoster.count();
  const finalClubs = await prisma.clubRoleAssignment.findMany({
    include: {
      user: { select: { displayName: true, username: true } },
      club: { select: { name: true, slug: true } },
    },
  });

  console.log("\n--- Final Database Status ---");
  console.log(`Total Users in DB: ${finalUsers} (1 Super Admin + 181 S-VYASA Students)`);
  console.log(`Total Mock Faculties: ${finalFaculties}`);
  console.log(`Total Rosters: ${finalRosters}`);
  console.log(`Active Club Presidents: ${finalClubs.length}`);
  for (const fc of finalClubs) {
    console.log(
      `  - ${fc.club.name} (${fc.club.slug}): ${fc.user.displayName} (USN: ${fc.user.username})`,
    );
  }
  console.log("--- Purge Complete ---");
}

main()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
