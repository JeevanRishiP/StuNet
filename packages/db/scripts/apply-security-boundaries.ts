/**
 * apply-security-boundaries.ts
 *
 * Runs after Prisma migrations to enforce the DB-level security boundary.
 *
 * Enforces:
 *   1. admin_service_role has ZERO privileges on user_private_details
 *   2. admin_service_role has ZERO privileges on auth_sessions / auth_tokens
 *   3. admin_audit_logs is INSERT-only for both runtime roles (no UPDATE/DELETE)
 *   4. posts & polls target_roles CHECK constraints (non-empty, subset of STUDENT/FACULTY/ALUMNI)
 *   5. DB-level functions & BEFORE INSERT/UPDATE triggers forbidding GUEST/banned/inactive users
 *      from creating posts, comments, likes, views, or professional invites, and enforcing
 *      strict post targetRoles + visibility + connection-scope access at the DB engine level.
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
     EXECUTE 'REVOKE ALL ON TABLE auth_credentials FROM admin_service_role';
   EXCEPTION WHEN undefined_table THEN NULL; END $$`,
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
  `DO $$ BEGIN
     EXECUTE 'GRANT INSERT, UPDATE, DELETE ON TABLE campus_batches, semester_subjects, campus_faculties TO admin_service_role';
   EXCEPTION WHEN undefined_table THEN NULL; END $$`,

  // ── 4. Normalize and lock target_roles CHECK constraints on posts & polls ──
  `UPDATE posts
   SET target_roles = ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[]
   WHERE target_roles IS NULL OR cardinality(target_roles) = 0 OR NOT (target_roles <@ ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[])`,

  `ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_target_roles_valid_chk`,
  `ALTER TABLE posts
     ADD CONSTRAINT posts_target_roles_valid_chk
     CHECK (
       target_roles IS NOT NULL
       AND cardinality(target_roles) >= 1
       AND target_roles <@ ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[]
     )`,

  `UPDATE polls
   SET target_roles = ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[]
   WHERE target_roles IS NULL OR cardinality(target_roles) = 0 OR NOT (target_roles <@ ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[])`,

  `ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_target_roles_valid_chk`,
  `ALTER TABLE polls
     ADD CONSTRAINT polls_target_roles_valid_chk
     CHECK (
       target_roles IS NOT NULL
       AND cardinality(target_roles) >= 1
       AND target_roles <@ ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[]
     )`,

  // ── 5. Canonical PostgreSQL viewer audience role resolver ──
  `CREATE OR REPLACE FUNCTION stunet_viewer_audience_role(p_user_id text)
   RETURNS text
   LANGUAGE plpgsql
   STABLE
   AS $$
   DECLARE
     v_role text;
     v_is_active boolean;
     v_is_banned boolean;
     v_has_faculty boolean;
   BEGIN
     IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
       RETURN 'GUEST';
     END IF;

     SELECT role::text, is_active, is_banned
     INTO v_role, v_is_active, v_is_banned
     FROM user_identity
     WHERE id = p_user_id;

     IF NOT FOUND OR NOT v_is_active OR v_is_banned OR v_role = 'GUEST' THEN
       RETURN 'GUEST';
     END IF;

     IF v_role IN ('STUDENT', 'FACULTY', 'ALUMNI') THEN
       RETURN v_role;
     END IF;

     SELECT EXISTS(SELECT 1 FROM faculty_details WHERE user_id = p_user_id)
     INTO v_has_faculty;

     IF v_role = 'CLUB_MANAGER' THEN
       IF v_has_faculty THEN
         RETURN 'FACULTY';
       END IF;
       RETURN 'STUDENT';
     END IF;

     IF v_role IN ('CAMPUS_MANAGER', 'SUPER_ADMIN') AND v_has_faculty THEN
       RETURN 'FACULTY';
     END IF;

     RETURN 'RESTRICTED_STAFF';
   END;
   $$`,

  // ── 6. Canonical PostgreSQL post access evaluator ──
  `CREATE OR REPLACE FUNCTION stunet_can_view_post(p_post_id text, p_viewer_id text)
   RETURNS boolean
   LANGUAGE plpgsql
   STABLE
   AS $$
   DECLARE
     v_post record;
     v_author_campus text;
     v_viewer_audience text;
     v_viewer_campus text;
     v_viewer_verified boolean;
     v_is_connected boolean;
   BEGIN
     SELECT p.id, p.author_id, p.visibility::text AS visibility,
            p.target_connection_scope, p.target_roles,
            p.is_hidden, p.deleted_at
     INTO v_post
     FROM posts p
     WHERE p.id = p_post_id;

     IF NOT FOUND OR v_post.deleted_at IS NOT NULL OR v_post.is_hidden THEN
       RETURN FALSE;
     END IF;

     IF v_post.target_roles IS NULL OR cardinality(v_post.target_roles) = 0 THEN
       RETURN FALSE;
     END IF;

     v_viewer_audience := stunet_viewer_audience_role(p_viewer_id);

     -- Author owns non-deleted, non-hidden posts (never GUEST)
     IF v_viewer_audience <> 'GUEST' AND p_viewer_id = v_post.author_id THEN
       RETURN TRUE;
     END IF;

     -- Block check in either direction
     IF p_viewer_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM user_blocks
       WHERE (initiator_id = p_viewer_id AND target_id = v_post.author_id)
          OR (initiator_id = v_post.author_id AND target_id = p_viewer_id)
     ) THEN
       RETURN FALSE;
     END IF;

     -- Guest / unrestricted-staff check: PUBLIC + ALL + ALL 3 target roles required
     IF v_viewer_audience IN ('GUEST', 'RESTRICTED_STAFF') THEN
       IF v_viewer_audience = 'GUEST' THEN
         RETURN v_post.visibility = 'PUBLIC'
            AND v_post.target_connection_scope = 'ALL'
            AND v_post.target_roles @> ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[];
       END IF;
       IF NOT (v_post.target_roles @> ARRAY['STUDENT', 'FACULTY', 'ALUMNI']::text[]) THEN
         RETURN FALSE;
       END IF;
     ELSE
       -- Strict STUDENT / FACULTY / ALUMNI target_roles isolation
       IF NOT (v_post.target_roles @> ARRAY[v_viewer_audience]::text[]) THEN
         RETURN FALSE;
       END IF;
     END IF;

     SELECT EXISTS (
       SELECT 1 FROM connections
       WHERE status = 'ACCEPTED'
         AND ((sender_id = p_viewer_id AND receiver_id = v_post.author_id)
           OR (sender_id = v_post.author_id AND receiver_id = p_viewer_id))
     ) INTO v_is_connected;

     IF v_post.target_connection_scope = 'CONNECTED' AND NOT v_is_connected THEN
       RETURN FALSE;
     END IF;

     IF v_post.visibility = 'PUBLIC' THEN
       RETURN TRUE;
     END IF;

     SELECT (verification_status = 'VERIFIED'), campus_id
     INTO v_viewer_verified, v_viewer_campus
     FROM user_identity
     WHERE id = p_viewer_id;

     IF NOT COALESCE(v_viewer_verified, FALSE) THEN
       RETURN FALSE;
     END IF;

     IF v_post.visibility = 'CONNECTIONS' THEN
       RETURN v_is_connected;
     END IF;

     IF v_post.visibility = 'CAMPUS' THEN
       SELECT campus_id INTO v_author_campus FROM user_identity WHERE id = v_post.author_id;
       RETURN v_viewer_campus IS NOT NULL AND v_author_campus IS NOT NULL AND v_viewer_campus = v_author_campus;
     END IF;

     RETURN FALSE;
   END;
   $$`,

  // ── 7. Trigger: Reject GUEST / banned / inactive authors on posts & professional_invites ──
  `CREATE OR REPLACE FUNCTION stunet_enforce_non_guest_author()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   DECLARE
     v_actor_id text;
     v_audience text;
   BEGIN
     IF TG_TABLE_NAME = 'posts' THEN
       v_actor_id := NEW.author_id;
     ELSIF TG_TABLE_NAME = 'professional_invites' THEN
       v_actor_id := NEW.creator_user_id;
     ELSE
       v_actor_id := NULL;
     END IF;

     v_audience := stunet_viewer_audience_role(v_actor_id);
     IF v_audience = 'GUEST' THEN
       RAISE EXCEPTION 'GUEST, inactive, or banned accounts cannot create posts or invites (%).', COALESCE(v_actor_id, 'NULL')
         USING ERRCODE = '42501';
     END IF;

     RETURN NEW;
   END;
   $$`,

  `DROP TRIGGER IF EXISTS trg_posts_enforce_non_guest_author ON posts`,
  `CREATE TRIGGER trg_posts_enforce_non_guest_author
   BEFORE INSERT OR UPDATE OF author_id ON posts
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_non_guest_author()`,

  `DROP TRIGGER IF EXISTS trg_invites_enforce_non_guest_author ON professional_invites`,
  `CREATE TRIGGER trg_invites_enforce_non_guest_author
   BEFORE INSERT OR UPDATE OF creator_user_id ON professional_invites
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_non_guest_author()`,

  // ── 8. Trigger: Reject GUEST & unauthorized role/visibility interactions on comments, likes, views ──
  `CREATE OR REPLACE FUNCTION stunet_enforce_post_interaction_access()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   DECLARE
     v_user_id text;
     v_audience text;
   BEGIN
     IF TG_TABLE_NAME = 'comments' THEN
       v_user_id := NEW.author_id;
     ELSE
       v_user_id := NEW.user_id;
     END IF;

     v_audience := stunet_viewer_audience_role(v_user_id);
     IF v_audience = 'GUEST' THEN
       RAISE EXCEPTION 'GUEST or restricted accounts cannot interact with posts.'
         USING ERRCODE = '42501';
     END IF;

     IF NOT stunet_can_view_post(NEW.post_id, v_user_id) THEN
       RAISE EXCEPTION 'Access denied: user % is not authorized for post %.', v_user_id, NEW.post_id
         USING ERRCODE = '42501';
     END IF;

     RETURN NEW;
   END;
   $$`,

  `DROP TRIGGER IF EXISTS trg_post_comments_access ON post_comments`,
  `CREATE TRIGGER trg_post_comments_access
   BEFORE INSERT ON post_comments
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_post_interaction_access()`,

  `DROP TRIGGER IF EXISTS trg_post_likes_access ON post_likes`,
  `CREATE TRIGGER trg_post_likes_access
   BEFORE INSERT ON post_likes
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_post_interaction_access()`,

  `DROP TRIGGER IF EXISTS trg_post_views_access ON post_views`,
  `CREATE TRIGGER trg_post_views_access
   BEFORE INSERT ON post_views
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_post_interaction_access()`,

  `DROP TRIGGER IF EXISTS trg_comments_access ON comments`,
  `CREATE TRIGGER trg_comments_access
   BEFORE INSERT ON comments
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_post_interaction_access()`,

  // ── 9. Explicit app_service_role table grants for follow, poll, & feed ranking v2 tables ──
  `GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_follows, poll_submissions, poll_entries, poll_options, polls, feed_impressions, author_engagement_stats, user_author_affinity, feed_model_versions TO app_service_role`,

  // ── 10. Trigger: LinkedIn-style UserFollow integrity (no self-follow, no GUEST, no blocks) ──
  `CREATE OR REPLACE FUNCTION stunet_enforce_follow_integrity()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   DECLARE
     v_follower_audience text;
     v_target_active boolean;
     v_target_banned boolean;
     v_target_role text;
   BEGIN
     IF NEW.follower_id = NEW.following_id THEN
       RAISE EXCEPTION 'Users cannot follow themselves.'
         USING ERRCODE = '23514';
     END IF;

     v_follower_audience := stunet_viewer_audience_role(NEW.follower_id);
     IF v_follower_audience = 'GUEST' THEN
       RAISE EXCEPTION 'GUEST, inactive, or banned accounts cannot follow users.'
         USING ERRCODE = '42501';
     END IF;

     SELECT is_active, is_banned, role::text
     INTO v_target_active, v_target_banned, v_target_role
     FROM user_identity
     WHERE id = NEW.following_id;

     IF NOT FOUND OR NOT v_target_active OR v_target_banned OR v_target_role = 'GUEST' THEN
       RAISE EXCEPTION 'Target user cannot be followed.'
         USING ERRCODE = '42501';
     END IF;

     IF EXISTS (
       SELECT 1 FROM user_blocks
       WHERE (initiator_id = NEW.follower_id AND target_id = NEW.following_id)
          OR (initiator_id = NEW.following_id AND target_id = NEW.follower_id)
     ) THEN
       RAISE EXCEPTION 'Blocked users cannot follow each other.'
         USING ERRCODE = '42501';
     END IF;

     RETURN NEW;
   END;
   $$`,

  `DROP TRIGGER IF EXISTS trg_user_follows_integrity ON user_follows`,
  `CREATE TRIGGER trg_user_follows_integrity
   BEFORE INSERT OR UPDATE ON user_follows
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_follow_integrity()`,

  // ── 11. Triggers: Strict Poll voting rules (single-submit lock, multi-answer check, role/guest access) ──
  `CREATE OR REPLACE FUNCTION stunet_enforce_poll_entry_rules()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   DECLARE
     v_poll record;
     v_opt_poll_id text;
     v_actor_id text;
     v_poll_id text;
     v_audience text;
     v_other_count int;
   BEGIN
     IF TG_OP = 'DELETE' THEN
       v_actor_id := OLD.creator_id;
       v_poll_id := OLD.poll_id;

       SELECT id, submission_mode::text AS submission_mode, closes_at
       INTO v_poll
       FROM polls
       WHERE id = v_poll_id;

       IF FOUND AND v_poll.submission_mode = 'SINGLE_SUBMIT' THEN
         IF EXISTS (
           SELECT 1 FROM poll_submissions
           WHERE poll_id = v_poll_id AND user_id = v_actor_id
         ) THEN
           RAISE EXCEPTION 'Cannot change or retract a single-submit poll vote.'
             USING ERRCODE = '42501';
         END IF;
       END IF;

       RETURN OLD;
     END IF;

     v_actor_id := NEW.creator_id;
     v_poll_id := NEW.poll_id;

     v_audience := stunet_viewer_audience_role(v_actor_id);
     IF v_audience = 'GUEST' THEN
       RAISE EXCEPTION 'GUEST or restricted accounts cannot vote in polls.'
         USING ERRCODE = '42501';
     END IF;

     SELECT id, post_id, allow_multiple_answers, submission_mode::text AS submission_mode, closes_at
     INTO v_poll
     FROM polls
     WHERE id = v_poll_id;

     IF NOT FOUND THEN
       RAISE EXCEPTION 'Poll not found (%).', v_poll_id
         USING ERRCODE = '23503';
     END IF;

     SELECT poll_id INTO v_opt_poll_id FROM poll_options WHERE id = NEW.option_id;
     IF NOT FOUND OR v_opt_poll_id <> v_poll_id THEN
       RAISE EXCEPTION 'Poll option % does not belong to poll %.', NEW.option_id, v_poll_id
         USING ERRCODE = '23514';
     END IF;

     IF NOT stunet_can_view_post(v_poll.post_id, v_actor_id) THEN
       RAISE EXCEPTION 'Access denied: user % is not authorized for poll %.', v_actor_id, v_poll_id
         USING ERRCODE = '42501';
     END IF;

     IF v_poll.closes_at IS NOT NULL AND v_poll.closes_at <= now() THEN
       RAISE EXCEPTION 'Poll % is closed.', v_poll_id
         USING ERRCODE = '42501';
     END IF;

     IF v_poll.submission_mode = 'SINGLE_SUBMIT' AND EXISTS (
       SELECT 1 FROM poll_submissions
       WHERE poll_id = v_poll_id AND user_id = v_actor_id
     ) THEN
       RAISE EXCEPTION 'Single-submit poll already submitted by user %.', v_actor_id
         USING ERRCODE = '42501';
     END IF;

     IF NOT v_poll.allow_multiple_answers THEN
       SELECT COUNT(*) INTO v_other_count
       FROM poll_entries
       WHERE poll_id = v_poll_id
         AND creator_id = v_actor_id
         AND option_id <> NEW.option_id;
       IF v_other_count > 0 THEN
         RAISE EXCEPTION 'Single-answer poll allows only one selected option.'
           USING ERRCODE = '42501';
       END IF;
     END IF;

     RETURN NEW;
   END;
   $$`,

  `DROP TRIGGER IF EXISTS trg_poll_entries_rules ON poll_entries`,
  `CREATE TRIGGER trg_poll_entries_rules
   BEFORE INSERT OR UPDATE OR DELETE ON poll_entries
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_poll_entry_rules()`,

  `CREATE OR REPLACE FUNCTION stunet_enforce_poll_submission_rules()
   RETURNS trigger
   LANGUAGE plpgsql
   AS $$
   DECLARE
     v_poll record;
     v_audience text;
   BEGIN
     IF TG_OP = 'DELETE' THEN
       SELECT submission_mode::text AS submission_mode INTO v_poll FROM polls WHERE id = OLD.poll_id;
       IF FOUND AND v_poll.submission_mode = 'SINGLE_SUBMIT' THEN
         RAISE EXCEPTION 'Cannot retract a single-submit poll submission.'
           USING ERRCODE = '42501';
       END IF;
       RETURN OLD;
     END IF;

     IF TG_OP = 'UPDATE' THEN
       SELECT submission_mode::text AS submission_mode INTO v_poll FROM polls WHERE id = OLD.poll_id;
       IF FOUND AND v_poll.submission_mode = 'SINGLE_SUBMIT' THEN
         RAISE EXCEPTION 'Single-submit poll responses cannot be resubmitted.'
           USING ERRCODE = '42501';
       END IF;
       RETURN NEW;
     END IF;

     v_audience := stunet_viewer_audience_role(NEW.user_id);
     IF v_audience = 'GUEST' THEN
       RAISE EXCEPTION 'GUEST or restricted accounts cannot submit polls.'
         USING ERRCODE = '42501';
     END IF;

     SELECT id, post_id, closes_at INTO v_poll FROM polls WHERE id = NEW.poll_id;
     IF NOT FOUND THEN
       RAISE EXCEPTION 'Poll not found (%).', NEW.poll_id
         USING ERRCODE = '23503';
     END IF;

     IF NOT stunet_can_view_post(v_poll.post_id, NEW.user_id) THEN
       RAISE EXCEPTION 'Access denied for poll submission.'
         USING ERRCODE = '42501';
     END IF;

     IF v_poll.closes_at IS NOT NULL AND v_poll.closes_at <= now() THEN
       RAISE EXCEPTION 'Poll is closed.'
         USING ERRCODE = '42501';
     END IF;

     RETURN NEW;
   END;
   $$`,

  `DROP TRIGGER IF EXISTS trg_poll_submissions_rules ON poll_submissions`,
  `CREATE TRIGGER trg_poll_submissions_rules
   BEFORE INSERT OR UPDATE OR DELETE ON poll_submissions
   FOR EACH ROW EXECUTE FUNCTION stunet_enforce_poll_submission_rules()`,
];

async function applySecurityBoundaries(): Promise<void> {
  console.log("Applying DB security boundaries...");
  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`Applied: ${sql.trim().substring(0, 65).replace(/\s+/g, " ")}...`);
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
