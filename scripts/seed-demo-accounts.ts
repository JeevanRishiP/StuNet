import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["DATABASE_URL"] ??
        "postgresql://stunet_owner:localdevonly@localhost:5434/stunet",
    },
  },
});

async function main() {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error(
      "SECURITY FATAL: seed-demo-accounts must NEVER run in a production environment!",
    );
  }

  const demoTotpSecret = process.env["DEMO_TOTP_SECRET"] || "JBSWY3DPEHPK3PXP";
  console.log("Seeding credentials for demo accounts (Local Dev Only)...");

  const studentHash = await argon2.hash("StudentPass123!", {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  const adminHash = await argon2.hash("AdminPass123!", {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // 1. Alice (Student)
  const alice = await prisma.userIdentity.findUnique({ where: { username: "alice_dev" } });
  if (alice) {
    await prisma.userPrivateDetails.upsert({
      where: { userId: alice.id },
      update: { email: "alice@niat.edu.in" },
      create: { userId: alice.id, email: "alice@niat.edu.in" },
    });
    await prisma.authCredential.upsert({
      where: { userId: alice.id },
      update: { passwordHash: studentHash },
      create: { userId: alice.id, passwordHash: studentHash },
    });
    console.log("✓ Alice Nair (alice@niat.edu.in) seeded. Password: StudentPass123!");
  }

  // 2. Carol (Campus Manager)
  const carol = await prisma.userIdentity.findUnique({ where: { username: "carol_admin" } });
  if (carol) {
    await prisma.userPrivateDetails.upsert({
      where: { userId: carol.id },
      update: {
        email: "carol@niat.edu.in",
        totpSecret: demoTotpSecret,
        totpEnabledAt: new Date(),
      },
      create: {
        userId: carol.id,
        email: "carol@niat.edu.in",
        totpSecret: demoTotpSecret,
        totpEnabledAt: new Date(),
      },
    });
    await prisma.authCredential.upsert({
      where: { userId: carol.id },
      update: { passwordHash: adminHash },
      create: { userId: carol.id, passwordHash: adminHash },
    });
    console.log(
      `✓ Carol Sharma (carol@niat.edu.in) seeded. Password: AdminPass123!, TOTP Secret: ${demoTotpSecret}`,
    );
  }

  // 3. Super Admin
  const superAdmin = await prisma.userIdentity.findUnique({ where: { username: "stunet_super" } });
  if (superAdmin) {
    await prisma.userPrivateDetails.upsert({
      where: { userId: superAdmin.id },
      update: {
        email: "superadmin@stunet.internal",
        totpSecret: demoTotpSecret,
        totpEnabledAt: new Date(),
      },
      create: {
        userId: superAdmin.id,
        email: "superadmin@stunet.internal",
        totpSecret: demoTotpSecret,
        totpEnabledAt: new Date(),
      },
    });
    await prisma.authCredential.upsert({
      where: { userId: superAdmin.id },
      update: { passwordHash: adminHash },
      create: { userId: superAdmin.id, passwordHash: adminHash },
    });
    console.log(
      `✓ Super Admin (superadmin@stunet.internal) seeded. Password: AdminPass123!, TOTP Secret: ${demoTotpSecret}`,
    );
  }

  console.log("Demo accounts seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
