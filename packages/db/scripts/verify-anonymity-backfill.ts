/**
 * packages/db/scripts/verify-anonymity-backfill.ts
 *
 * Standing Post-Deploy & Post-Migration Verification Check for CR-03 (Anonymous Post True Disconnect).
 *
 * Verifies:
 * 1. ZERO anonymous posts have an author_id (complete historical & active backfill integrity).
 * 2. ZERO anonymous polls are linked to parent posts that have an author_id.
 * 3. The hard CHECK constraint `anonymous_posts_have_no_author` is active on `posts`.
 * 4. The enforcement trigger `trg_posts_enforce_non_guest_author` is present and active (tgenabled = 'O').
 *
 * Exits 0 on success; exits 1 on any violation.
 */

import { PrismaClient } from "@prisma/client";

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
  console.log("=== CR-03 STANDING POST-DEPLOY ANONYMITY VERIFICATION ===");

  // 1. Check anonymous posts for non-null author_id
  const postLeakResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count FROM posts WHERE is_anonymous = true AND author_id IS NOT NULL;
  `;
  const postLeakCount = Number(postLeakResult[0]?.count ?? 0n);
  console.log(`[1] Anonymous posts with author_id: ${postLeakCount}`);
  if (postLeakCount > 0) {
    console.error(
      `❌ CRITICAL: Found ${postLeakCount} anonymous post(s) with author_id populated!`,
    );
    process.exit(1);
  }

  // 2. Check polls linked to parent posts
  const pollLeakResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count
    FROM polls pl
    JOIN posts p ON pl.post_id = p.id
    WHERE (pl.is_anonymous = true OR p.is_anonymous = true) AND p.author_id IS NOT NULL;
  `;
  const pollLeakCount = Number(pollLeakResult[0]?.count ?? 0n);
  console.log(`[2] Anonymous polls with parent post author_id: ${pollLeakCount}`);
  if (pollLeakCount > 0) {
    console.error(`❌ CRITICAL: Found ${pollLeakCount} anonymous poll(s) linked to an author!`);
    process.exit(1);
  }

  // 3. Confirm CHECK constraint anonymous_posts_have_no_author exists
  const constraints = await prisma.$queryRaw<Array<{ conname: string; def: string }>>`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'posts'::regclass AND contype = 'c';
  `;
  const anonConstraint = constraints.find((c) => c.conname === "anonymous_posts_have_no_author");
  if (!anonConstraint) {
    console.error(
      `❌ CRITICAL: CHECK constraint 'anonymous_posts_have_no_author' is MISSING on posts!`,
    );
    process.exit(1);
  }
  console.log(`[3] CHECK constraint confirmed: ${anonConstraint.conname} -> ${anonConstraint.def}`);

  // 4. Confirm enforcement trigger is enabled (tgenabled = 'O')
  const triggers = await prisma.$queryRaw<Array<{ tgname: string; tgenabled: string }>>`
    SELECT tgname, tgenabled
    FROM pg_trigger
    WHERE tgrelid = 'posts'::regclass AND tgname = 'trg_posts_enforce_non_guest_author';
  `;
  const trigger = triggers[0];
  if (!trigger) {
    console.error(`❌ CRITICAL: Trigger 'trg_posts_enforce_non_guest_author' is MISSING on posts!`);
    process.exit(1);
  }
  if (trigger.tgenabled !== "O") {
    console.error(
      `❌ CRITICAL: Trigger 'trg_posts_enforce_non_guest_author' is disabled! tgenabled = '${trigger.tgenabled}'`,
    );
    process.exit(1);
  }
  console.log(
    `[4] Enforcement trigger confirmed: ${trigger.tgname} (tgenabled: '${trigger.tgenabled}')`,
  );

  console.log(
    "\n✅ ALL CR-03 ANONYMITY CHECKS PASSED: Zero leaks, constraint active, triggers enabled.\n",
  );
}

main()
  .catch((err) => {
    console.error("Verification script failed with exception:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
