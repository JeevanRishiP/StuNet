-- ============================================================
-- StuNet Security Boundary Grants
-- Applied after Prisma migrations have run.
-- This script is idempotent; safe to re-run.
-- ============================================================
-- NOTE: This script is a template. The actual REVOKE statements
-- for user_private_details and auth tables are applied via a
-- Prisma migration post-hook (packages/db/scripts/apply-security-boundaries.ts)
-- which runs after the schema is created.
--
-- The relevant rules:
--   1. admin_service_role has ZERO SELECT/INSERT/UPDATE/DELETE on user_private_details
--   2. admin_service_role has ZERO access on auth_sessions, auth_tokens tables
--   3. admin_audit_logs is INSERT-only for both runtime roles (no UPDATE/DELETE)
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE 'Security boundary SQL template loaded. Run apply-security-boundaries.ts after migrations.';
END
$$;
