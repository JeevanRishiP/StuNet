-- ============================================================
-- StuNet PostgreSQL Roles & Initial Grants
-- Run automatically on first container boot via initdb.d
-- ============================================================
-- Security architecture:
--   stunet_owner       — superuser-equivalent for migrations only (Prisma CLI)
--   app_service_role   — runtime role for apps/web and apps/worker
--                        has NO access to user_private_details or auth tables
--   admin_service_role — runtime role for apps/admin
--                        has NO access to user_private_details at all
--
-- Table-level grants are added in subsequent init scripts (002_...)
-- as tables are created, so both roles always exist before any table.
-- ============================================================

-- Create roles (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service_role') THEN
    CREATE ROLE app_service_role LOGIN PASSWORD 'app_localdev_CHANGE_ME';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_service_role') THEN
    CREATE ROLE admin_service_role LOGIN PASSWORD 'admin_localdev_CHANGE_ME';
  END IF;
END
$$;

-- Grant CONNECT on the database to both runtime roles
GRANT CONNECT ON DATABASE stunet TO app_service_role;
GRANT CONNECT ON DATABASE stunet TO admin_service_role;

-- Grant USAGE on public schema
GRANT USAGE ON SCHEMA public TO app_service_role;
GRANT USAGE ON SCHEMA public TO admin_service_role;

-- ── Default privileges ────────────────────────────────────────────────────
-- When stunet_owner (the Prisma migration user) creates new tables,
-- automatically grant SELECT/INSERT/UPDATE/DELETE to app_service_role.
-- admin_service_role gets only what is explicitly granted in later scripts.
ALTER DEFAULT PRIVILEGES FOR ROLE stunet_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE stunet_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_service_role;

-- admin_service_role: by default gets SELECT only on new tables.
-- Specific tables (user_private_details, auth tables) will have REVOKE applied
-- in 002_security_boundaries.sql after those tables exist.
ALTER DEFAULT PRIVILEGES FOR ROLE stunet_owner IN SCHEMA public
  GRANT SELECT ON TABLES TO admin_service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE stunet_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO admin_service_role;

-- ── Audit log table: append-only for both runtime roles ───────────────────
-- (Actual table created in Prisma migrations; this ensures the privilege
--  is set correctly at the DB level from the start)
-- Revoke UPDATE/DELETE from admin_audit_logs for admin_service_role.
-- Applied in 003_audit_log_grants.sql after the table exists.

-- Log that roles were created
DO $$
BEGIN
  RAISE NOTICE 'StuNet DB roles created: app_service_role, admin_service_role';
END
$$;
