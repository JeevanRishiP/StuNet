// ============================================================
// StuNet seed — Phase 1
// Creates: 2 campuses, 4 clubs, 6 users, connections, blocks
// Run via: pnpm --filter @stunet/db db:seed
// ============================================================
import { PrismaClient, UserRole, VerificationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("🌱 Seeding StuNet database...");

  // ── Campuses ─────────────────────────────────────────────
  const niat = await prisma.campus.upsert({
    where: { slug: "niat-chennai" },
    update: {},
    create: {
      name: "NIAT Chennai",
      slug: "niat-chennai",
      emailDomain: "niat.edu.in",
      city: "Chennai",
      state: "Tamil Nadu",
      websiteUrl: "https://niat.edu.in",
    },
  });

  const niatHyd = await prisma.campus.upsert({
    where: { slug: "niat-hyderabad" },
    update: {},
    create: {
      name: "NIAT Hyderabad",
      slug: "niat-hyderabad",
      emailDomain: "hyd.niat.edu.in",
      city: "Hyderabad",
      state: "Telangana",
      websiteUrl: "https://niat.edu.in",
    },
  });

  console.log(`✓ Campuses: ${niat.name}, ${niatHyd.name}`);

  // ── Clubs ────────────────────────────────────────────────
  const codingClub = await prisma.club.upsert({
    where: { id: "club-coding-niat" },
    update: {},
    create: {
      id: "club-coding-niat",
      campusId: niat.id,
      name: "NIAT Coding Club",
      slug: "coding-club",
      description: "Competitive programming, open source, hackathons.",
      category: "Technology",
      institutionalEmail: "coding@niat.edu.in",
    },
  });

  const designClub = await prisma.club.upsert({
    where: { id: "club-design-niat" },
    update: {},
    create: {
      id: "club-design-niat",
      campusId: niat.id,
      name: "NIAT Design Guild",
      slug: "design-guild",
      description: "UI/UX, graphic design, branding workshops.",
      category: "Design",
      institutionalEmail: "design@niat.edu.in",
    },
  });

  const debateClub = await prisma.club.upsert({
    where: { id: "club-debate-niat" },
    update: {},
    create: {
      id: "club-debate-niat",
      campusId: niat.id,
      name: "NIAT Debate Society",
      slug: "debate-society",
      description: "Parliamentary debate, Model UN, public speaking.",
      category: "Literary",
    },
  });

  const aiClub = await prisma.club.upsert({
    where: { id: "club-ai-hyd" },
    update: {},
    create: {
      id: "club-ai-hyd",
      campusId: niatHyd.id,
      name: "AI & ML Club",
      slug: "ai-ml-club",
      description: "Machine learning, AI research, Kaggle competitions.",
      category: "Technology",
      institutionalEmail: "aiml@hyd.niat.edu.in",
    },
  });

  console.log(
    `✓ Clubs: ${codingClub.name}, ${designClub.name}, ${debateClub.name}, ${aiClub.name}`,
  );

  // ── Users (UserIdentity only — UserPrivateDetails created by auth flow) ──
  const alice = await prisma.userIdentity.upsert({
    where: { username: "alice_dev" },
    update: {},
    create: {
      campusId: niat.id,
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
    update: {},
    create: {
      campusId: niat.id,
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
    update: {},
    create: {
      campusId: niat.id,
      managedCampusId: niat.id,
      role: UserRole.CAMPUS_MANAGER,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Carol Sharma",
      username: "carol_admin",
      headline: "Campus Manager — NIAT Chennai",
    },
  });

  const dave = await prisma.userIdentity.upsert({
    where: { username: "dave_ml" },
    update: {},
    create: {
      campusId: niatHyd.id,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.VERIFIED,
      displayName: "Dave Patel",
      username: "dave_ml",
      bio: "AI/ML researcher | Kaggle Expert",
      headline: "AI & ML Club Lead",
    },
  });

  const eve = await prisma.userIdentity.upsert({
    where: { username: "eve_pending" },
    update: {},
    create: {
      campusId: niat.id,
      role: UserRole.STUDENT,
      verificationStatus: VerificationStatus.PENDING,
      displayName: "Eve Menon",
      username: "eve_pending",
      bio: "Waiting for domain verification",
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

  console.log(`✓ Users: alice, bob, carol (campus_manager), dave, eve (pending), super_admin`);

  // ── Club memberships ──────────────────────────────────────
  await prisma.clubMember.upsert({
    where: { id: `cm-alice-coding` },
    update: {},
    create: {
      id: "cm-alice-coding",
      clubId: codingClub.id,
      userId: alice.id,
      role: "MANAGER",
    },
  });

  await prisma.clubMember.upsert({
    where: { id: `cm-bob-design` },
    update: {},
    create: {
      id: "cm-bob-design",
      clubId: designClub.id,
      userId: bob.id,
      role: "PRESIDENT",
    },
  });

  await prisma.clubMember.upsert({
    where: { id: `cm-dave-ai` },
    update: {},
    create: {
      id: "cm-dave-ai",
      clubId: aiClub.id,
      userId: dave.id,
      role: "MANAGER",
    },
  });

  console.log("✓ Club memberships seeded");

  // ── Connection (alice → bob, accepted) ────────────────────
  await prisma.connection.upsert({
    where: { id: "conn-alice-bob" },
    update: {},
    create: {
      id: "conn-alice-bob",
      senderId: alice.id,
      receiverId: bob.id,
      status: "ACCEPTED",
    },
  });

  console.log("✓ Connection: alice ↔ bob (accepted)");

  // ── Sample post ───────────────────────────────────────────
  await prisma.post.upsert({
    where: { id: "post-alice-001" },
    update: {},
    create: {
      id: "post-alice-001",
      authorId: alice.id,
      clubId: codingClub.id,
      type: "TEXT",
      visibility: "PUBLIC",
      body: "Just hit Specialist on Codeforces! 🎉 Grateful for the NIAT Coding Club for all the practice sessions.",
    },
  });

  console.log("✓ Sample post seeded");

  // ── Achievement (alice, pending verification) ─────────────
  await prisma.achievement.upsert({
    where: { id: "ach-alice-cf" },
    update: {},
    create: {
      id: "ach-alice-cf",
      userId: alice.id,
      title: "Codeforces Specialist",
      description: "Reached Specialist rating (1400+) on Codeforces",
      category: "COMPETITIVE_PROGRAMMING",
      scope: "INTER_COLLEGE",
      platform: "Codeforces",
      achievedAt: new Date("2026-10-01"),
      verificationStatus: "PENDING",
      externalScore: 1423,
    },
  });

  console.log("✓ Achievement seeded (pending verification)");

  console.log("\n✅ Seed complete.");
  console.log("   Next: start Docker infra and run `pnpm --filter @stunet/db db:migrate`");
}

main()
  .catch((err: unknown) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
