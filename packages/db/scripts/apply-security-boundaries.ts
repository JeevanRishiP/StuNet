/**
 * apply-security-boundaries.ts
 *
 * Runs after Prisma migrations to enforce the DB-level security boundary.
 *
 * Enforces:
 *   1. admin_service_role has ZERO privileges on user_private_details
 *   2. admin_service_role has ZERO privileges on auth_sessions / auth_tokens
 *   3. admin_audit_logs is INSERT-only for both runtime roles (no UPDATE/DELETE)
 *
 * Run via: pnpm --filter @stunet/db db:security-check
 * Must connect as stunet_owner (DATABASE_OWNER_URL or DATABASE_URL).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env["DATABASE_OWNER_URL"] ?? process.env["DATABASE_URL"],
    },
  },
});

const statements = [
  `REVOKE ALL ON TABLE user_private_details FROM admin_service_role`,
  `DO $$ BEGIN
     EXECUTE 'REVOKE ALL ON TABLE auth_sessions FROM admin_service_role';
   EXCEPTION WHEN undefined_table THEN NULL; END $$`,
  `DO $$ BEGIN
     EXECUTE 'REVOKE ALL ON TABLE auth_tokens FROM admin_service_role';
   EXCEPTION WHEN undefined_table THEN NULL; END $$`,
  `DO $$ BEGIN
     EXECUTE 'REVOKE UPDATE, DELETE ON TABLE admin_audit_logs FROM admin_service_role';
     EXECUTE 'REVOKE UPDATE, DELETE ON TABLE admin_audit_logs FROM app_service_role';
   EXCEPTION WHEN undefined_table THEN NULL; END $$`,
];

async function applySecurityBoundaries(): Promise<void> {
  console.log("Applying DB security boundaries...");
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`Applied: ${sql.substring(0, 60)}...`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist")) {
        console.warn(`Skipped (not yet created): ${msg}`);
      } else {
        throw err;
      }
    }
  }
  console.log("Security boundaries applied.");
}

applySecurityBoundaries()
  .catch((err: unknown) => {
    console.error("Failed to apply security boundaries:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
