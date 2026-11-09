import { prisma } from "../packages/db/src";

async function main() {
  console.log("Seeding groups with 4-digit codes...");

  // Find Jeevan, Harshitha, Sankirth
  const jeevan = await prisma.userIdentity.findUnique({ where: { username: "2102508579" } });
  const harshitha = await prisma.userIdentity.findUnique({ where: { username: "2102508576" } });
  const sankirth = await prisma.userIdentity.findUnique({ where: { username: "2102508646" } });

  if (!jeevan || !harshitha || !sankirth) {
    console.error("Required users not found!");
    return;
  }

  // 1. Group 4218: NIAT Venture Founders Circle (Owned by Jeevan Rishi P)
  const g1 = await prisma.group.upsert({
    where: { slug: "niat-venture-founders-circle-4218" },
    update: {
      name: "NIAT Venture Founders Circle",
      shortCode: "4218",
      description:
        "Peer discussions on early-stage seed fundraising, customer discovery, and pitch decks.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-startup-founders",
      type: "CLOSED",
      hideMembers: true,
      memberCount: 3,
      isActive: true,
      ownerId: jeevan.id,
    },
    create: {
      name: "NIAT Venture Founders Circle",
      slug: "niat-venture-founders-circle-4218",
      shortCode: "4218",
      description:
        "Peer discussions on early-stage seed fundraising, customer discovery, and pitch decks.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-startup-founders",
      type: "CLOSED",
      hideMembers: true,
      memberCount: 3,
      isActive: true,
      ownerId: jeevan.id,
    },
  });

  // Members for g1: Jeevan (ADMIN), Harshitha (MEMBER), Sankirth (MEMBER)
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g1.id, userId: jeevan.id } },
    update: { role: "MODERATOR" },
    create: { groupId: g1.id, userId: jeevan.id, role: "MODERATOR" },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g1.id, userId: harshitha.id } },
    update: { role: "MEMBER" },
    create: { groupId: g1.id, userId: harshitha.id, role: "MEMBER" },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g1.id, userId: sankirth.id } },
    update: { role: "MEMBER" },
    create: { groupId: g1.id, userId: sankirth.id, role: "MEMBER" },
  });

  // Join request for g1
  const tanmay = await prisma.userIdentity.findFirst({
    where: { NOT: { id: { in: [jeevan.id, harshitha.id, sankirth.id] } } },
  });
  if (tanmay) {
    await prisma.groupJoinRequest.upsert({
      where: { id: "seed-req-4218-1" },
      update: {
        groupId: g1.id,
        userId: tanmay.id,
        purpose: "Working on our early-stage AI health-tech prototype and need founder feedback.",
        status: "PENDING",
      },
      create: {
        id: "seed-req-4218-1",
        groupId: g1.id,
        userId: tanmay.id,
        purpose: "Working on our early-stage AI health-tech prototype and need founder feedback.",
        status: "PENDING",
      },
    });
  }

  // 2. Group 1042: Smart India Hackathon AI Squad (Owned by Harshitha, Jeevan is MEMBER)
  const g2 = await prisma.group.upsert({
    where: { slug: "sih-ai-squad-1042" },
    update: {
      name: "Smart India Hackathon AI Squad",
      shortCode: "1042",
      description: "Preparing full-stack and ML architectures for national hackathon finalists.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-hackathon-squad",
      type: "CLOSED",
      hideMembers: false,
      memberCount: 3,
      isActive: true,
      ownerId: harshitha.id,
    },
    create: {
      name: "Smart India Hackathon AI Squad",
      slug: "sih-ai-squad-1042",
      shortCode: "1042",
      description: "Preparing full-stack and ML architectures for national hackathon finalists.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-hackathon-squad",
      type: "CLOSED",
      hideMembers: false,
      memberCount: 3,
      isActive: true,
      ownerId: harshitha.id,
    },
  });

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g2.id, userId: harshitha.id } },
    update: { role: "MODERATOR" },
    create: { groupId: g2.id, userId: harshitha.id, role: "MODERATOR" },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g2.id, userId: jeevan.id } },
    update: { role: "MEMBER" },
    create: { groupId: g2.id, userId: jeevan.id, role: "MEMBER" },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g2.id, userId: sankirth.id } },
    update: { role: "MEMBER" },
    create: { groupId: g2.id, userId: sankirth.id, role: "MEMBER" },
  });

  // 3. Group 2085: Open Source Rust Guild (Owned by Sankirth, Public group)
  const g3 = await prisma.group.upsert({
    where: { slug: "open-source-rust-guild-2085" },
    update: {
      name: "Open Source Rust Guild",
      shortCode: "2085",
      description: "Building systems tooling, web servers, and high performance network daemons.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-rust-guild",
      type: "OPEN",
      hideMembers: false,
      memberCount: 2,
      isActive: true,
      ownerId: sankirth.id,
    },
    create: {
      name: "Open Source Rust Guild",
      slug: "open-source-rust-guild-2085",
      shortCode: "2085",
      description: "Building systems tooling, web servers, and high performance network daemons.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-rust-guild",
      type: "OPEN",
      hideMembers: false,
      memberCount: 2,
      isActive: true,
      ownerId: sankirth.id,
    },
  });

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g3.id, userId: sankirth.id } },
    update: { role: "MODERATOR" },
    create: { groupId: g3.id, userId: sankirth.id, role: "MODERATOR" },
  });
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g3.id, userId: harshitha.id } },
    update: { role: "MEMBER" },
    create: { groupId: g3.id, userId: harshitha.id, role: "MEMBER" },
  });

  // 4. Group 3104: Bengaluru Competitive Coders (Owned by Harshitha, Request Required, Members hidden)
  const g4 = await prisma.group.upsert({
    where: { slug: "bengaluru-competitive-coders-3104" },
    update: {
      name: "Bengaluru Competitive Coders",
      shortCode: "3104",
      description:
        "Weekly problem discussion for LeetCode contests, AtCoder rounds, and ICPC practice.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-competitive-coders",
      type: "CLOSED",
      hideMembers: true,
      memberCount: 1,
      isActive: true,
      ownerId: harshitha.id,
    },
    create: {
      name: "Bengaluru Competitive Coders",
      slug: "bengaluru-competitive-coders-3104",
      shortCode: "3104",
      description:
        "Weekly problem discussion for LeetCode contests, AtCoder rounds, and ICPC practice.",
      externalLinkUrl: "https://chat.whatsapp.com/sample-competitive-coders",
      type: "CLOSED",
      hideMembers: true,
      memberCount: 1,
      isActive: true,
      ownerId: harshitha.id,
    },
  });

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: g4.id, userId: harshitha.id } },
    update: { role: "MODERATOR" },
    create: { groupId: g4.id, userId: harshitha.id, role: "MODERATOR" },
  });

  console.log("Successfully seeded 4 groups with 4-digit numeric IDs (4218, 1042, 2085, 3104)!");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
