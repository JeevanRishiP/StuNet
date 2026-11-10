/**
 * scripts/check-success-board-db.ts
 * Quick sanity check on seeded success board data
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [bmCount, achCount, plCount] = await Promise.all([
    db.braveMetric.count(),
    db.achievement.count({ where: { verificationStatus: "VERIFIED" } }),
    db.profileLink.count(),
  ]);

  console.log("=== Success Board DB State ===");
  console.log(`BraveMetrics:         ${bmCount}`);
  console.log(`Verified Achievements: ${achCount}`);
  console.log(`ProfileLinks:         ${plCount}`);

  const metrics = await db.braveMetric.findMany({
    select: {
      platform: true,
      metricValue: true,
      metricKey: true,
      user: { select: { name: true } },
    },
    orderBy: { metricValue: "desc" },
  });

  console.log("\n=== Seeded Metrics ===");
  for (const m of metrics) {
    console.log(
      `  ${m.user?.name ?? "unknown"} | ${m.platform} | ${m.metricKey}: ${m.metricValue}`,
    );
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
