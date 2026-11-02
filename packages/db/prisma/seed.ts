import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log("Seeding database — Phase 0 placeholder");
  const hc = await prisma.healthCheck.create({ data: {} });
  console.log(`Health check row created: id=${hc.id}`);
}

main()
  .then(() => {
    console.log("Seed complete");
  })
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
