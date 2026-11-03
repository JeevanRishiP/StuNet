/**
 * role-isolation.test.ts
 *
 * Phase 1 security gate — proves that admin_service_role cannot read
 * user_private_details at the DATABASE level, not just at the application layer.
 *
 * Per the build plan (Section 4 — Access Control):
 *   "admin app's Prisma client connects with admin_service_role, which has
 *    zero grants on user_private_details ... verified by an automated test
 *    that attempts a forbidden query and asserts it fails at the database,
 *    not just at the application layer."
 *
 * Run: pnpm --filter @stunet/db exec vitest run src/__tests__/role-isolation.test.ts
 * Requires: Docker infra running (postgres), migrations applied, security boundaries applied.
 */

import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// ── Clients connecting with each role ────────────────────────────────────────

const appClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["APP_DATABASE_URL"] ??
        "postgresql://app_service_role:app_localdev_CHANGE_ME@localhost:5434/stunet",
    },
  },
});

const adminClient = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env["ADMIN_DATABASE_URL"] ??
        "postgresql://admin_service_role:admin_localdev_CHANGE_ME@localhost:5434/stunet",
    },
  },
});

afterAll(async () => {
  await appClient.$disconnect();
  await adminClient.$disconnect();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DB role isolation — admin_service_role cannot read user_private_details", () => {
  it("admin_service_role SELECT on user_private_details throws a permission error", async () => {
    await expect(
      adminClient.$queryRaw`SELECT email FROM user_private_details LIMIT 1`,
    ).rejects.toThrow(/permission denied/i);
  });

  it("admin_service_role cannot INSERT into user_private_details", async () => {
    await expect(
      adminClient.$executeRaw`
        INSERT INTO user_private_details (user_id, email, created_at, updated_at)
        VALUES ('fake-id', 'test@example.com', NOW(), NOW())
      `,
    ).rejects.toThrow(/permission denied/i);
  });

  it("admin_service_role cannot UPDATE user_private_details", async () => {
    await expect(
      adminClient.$executeRaw`
        UPDATE user_private_details SET email = 'hacked@example.com' WHERE 1=0
      `,
    ).rejects.toThrow(/permission denied/i);
  });

  it("admin_service_role cannot DELETE from user_private_details", async () => {
    await expect(
      adminClient.$executeRaw`DELETE FROM user_private_details WHERE 1=0`,
    ).rejects.toThrow(/permission denied/i);
  });

  it("admin_service_role cannot SELECT from auth_sessions", async () => {
    await expect(adminClient.$queryRaw`SELECT id FROM auth_sessions LIMIT 1`).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("admin_service_role cannot SELECT from auth_credentials", async () => {
    await expect(adminClient.$queryRaw`SELECT id FROM auth_credentials LIMIT 1`).rejects.toThrow(
      /permission denied/i,
    );
  });

  it("admin_service_role cannot UPDATE admin_audit_logs (append-only)", async () => {
    await expect(
      adminClient.$executeRaw`
        UPDATE admin_audit_logs SET action = 'TAMPERED' WHERE 1=0
      `,
    ).rejects.toThrow(/permission denied/i);
  });

  it("admin_service_role cannot DELETE from admin_audit_logs (append-only)", async () => {
    await expect(adminClient.$executeRaw`DELETE FROM admin_audit_logs WHERE 1=0`).rejects.toThrow(
      /permission denied/i,
    );
  });
});

describe("DB role isolation — app_service_role has correct access", () => {
  it("app_service_role CAN SELECT from user_identity", async () => {
    await expect(appClient.$queryRaw`SELECT id FROM user_identity LIMIT 1`).resolves.toBeDefined();
  });

  it("app_service_role CAN SELECT from user_private_details", async () => {
    // app_service_role needs this for auth (login, signup) — admin_service_role does not
    await expect(
      appClient.$queryRaw`SELECT user_id FROM user_private_details LIMIT 1`,
    ).resolves.toBeDefined();
  });

  it("app_service_role cannot UPDATE admin_audit_logs (append-only)", async () => {
    await expect(
      appClient.$executeRaw`UPDATE admin_audit_logs SET action = 'TAMPERED' WHERE 1=0`,
    ).rejects.toThrow(/permission denied/i);
  });

  it("app_service_role cannot DELETE from admin_audit_logs (append-only)", async () => {
    await expect(appClient.$executeRaw`DELETE FROM admin_audit_logs WHERE 1=0`).rejects.toThrow(
      /permission denied/i,
    );
  });
});
