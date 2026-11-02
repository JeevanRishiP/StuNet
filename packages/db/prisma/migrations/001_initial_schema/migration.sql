-- ============================================================
-- Migration 001: initial_schema
-- StuNet — all tables in the Section 6 build order.
-- Run via: pnpm --filter @stunet/db db:migrate
-- ============================================================

-- ENUMS
CREATE TYPE "user_role" AS ENUM ('STUDENT', 'CLUB_MANAGER', 'CAMPUS_MANAGER', 'SUPER_ADMIN');
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "connection_status" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
CREATE TYPE "post_visibility" AS ENUM ('PUBLIC', 'CONNECTIONS', 'CAMPUS');
CREATE TYPE "post_type" AS ENUM ('TEXT', 'IMAGE', 'LINK', 'POLL');
CREATE TYPE "group_type" AS ENUM ('OPEN', 'CLOSED', 'SECRET');
CREATE TYPE "group_member_role" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
CREATE TYPE "achievement_category" AS ENUM ('COMPETITIVE_PROGRAMMING', 'OPEN_SOURCE', 'RESEARCH', 'HACKATHON', 'CERTIFICATION', 'SPORTS', 'CULTURAL', 'ACADEMIC', 'OTHER');
CREATE TYPE "achievement_scope" AS ENUM ('CAMPUS', 'INTER_COLLEGE', 'STATE', 'NATIONAL', 'INTERNATIONAL');
CREATE TYPE "achievement_verification_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "club_member_role" AS ENUM ('MEMBER', 'MANAGER', 'PRESIDENT');
CREATE TYPE "market_listing_status" AS ENUM ('ACTIVE', 'SOLD', 'FLAGGED', 'REMOVED');
CREATE TYPE "market_listing_condition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');
CREATE TYPE "notification_type" AS ENUM ('CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'POST_LIKE', 'POST_COMMENT', 'ACHIEVEMENT_VERIFIED', 'ACHIEVEMENT_REJECTED', 'CLUB_INVITE', 'CLUB_ROLE_ASSIGNED', 'CLUB_ROLE_REVOKED', 'SUGGESTION_VOTE', 'LIVE_ALERT', 'MARKET_INTEREST', 'REPORT_RESOLVED', 'SYSTEM');
CREATE TYPE "report_content_type" AS ENUM ('POST', 'COMMENT', 'USER_PROFILE', 'CLUB', 'GROUP', 'MARKET_LISTING', 'POLL_ENTRY');
CREATE TYPE "report_status" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_ACTION_TAKEN', 'RESOLVED_NO_ACTION', 'DISMISSED');
CREATE TYPE "bulk_action_type" AS ENUM ('BULK_VERIFY_ACHIEVEMENTS', 'BULK_REMOVE_POSTS', 'BULK_BAN_USERS', 'BULK_ASSIGN_CLUB_ROLE');
CREATE TYPE "alert_severity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');
CREATE TYPE "deletion_request_status" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');
CREATE TYPE "contact_visibility" AS ENUM ('PUBLIC', 'CONNECTIONS', 'CAMPUS', 'ONLY_ME');

-- ── 1. CAMPUSES & CLUBS ─────────────────────────────────────────────────────

CREATE TABLE "campuses" (
    "id"           TEXT NOT NULL,
    "name"         VARCHAR(200) NOT NULL,
    "slug"         VARCHAR(100) NOT NULL,
    "email_domain" VARCHAR(100) NOT NULL,
    "city"         VARCHAR(100) NOT NULL,
    "state"        VARCHAR(100) NOT NULL,
    "country"      VARCHAR(100) NOT NULL DEFAULT 'India',
    "logo_url"     VARCHAR(500),
    "website_url"  VARCHAR(500),
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "campuses_slug_key"         ON "campuses"("slug");
CREATE UNIQUE INDEX "campuses_email_domain_key" ON "campuses"("email_domain");
CREATE INDEX        "campuses_email_domain_idx" ON "campuses"("email_domain");

CREATE TABLE "clubs" (
    "id"                   TEXT NOT NULL,
    "campus_id"            TEXT NOT NULL,
    "name"                 VARCHAR(200) NOT NULL,
    "slug"                 VARCHAR(100) NOT NULL,
    "description"          TEXT NOT NULL,
    "category"             VARCHAR(100) NOT NULL,
    "institutional_email"  VARCHAR(254),
    "institutional_phone"  VARCHAR(20),
    "logo_url"             VARCHAR(500),
    "banner_url"           VARCHAR(500),
    "is_active"            BOOLEAN NOT NULL DEFAULT true,
    "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "clubs_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "clubs_campus_id_slug_key" ON "clubs"("campus_id", "slug");
CREATE INDEX        "clubs_campus_id_idx"       ON "clubs"("campus_id");

-- ── 2. USER IDENTITY & PRIVATE DETAILS ──────────────────────────────────────

CREATE TABLE "user_identity" (
    "id"                  TEXT NOT NULL,
    "campus_id"           TEXT,
    "managed_campus_id"   TEXT,
    "role"                "user_role" NOT NULL DEFAULT 'STUDENT',
    "verification_status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "display_name"        VARCHAR(60) NOT NULL,
    "username"            VARCHAR(40) NOT NULL,
    "avatar_url"          VARCHAR(500),
    "bio"                 VARCHAR(500),
    "headline"            VARCHAR(120),
    "contact_visibility"  "contact_visibility" NOT NULL DEFAULT 'CONNECTIONS',
    "is_active"           BOOLEAN NOT NULL DEFAULT true,
    "is_banned"           BOOLEAN NOT NULL DEFAULT false,
    "banned_at"           TIMESTAMP(3),
    "banned_reason"       VARCHAR(500),
    "last_seen_at"        TIMESTAMP(3),
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_identity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_identity_campus_id_fkey"         FOREIGN KEY ("campus_id")         REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "user_identity_managed_campus_id_fkey" FOREIGN KEY ("managed_campus_id") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_identity_username_key"          ON "user_identity"("username");
CREATE INDEX        "user_identity_campus_id_idx"         ON "user_identity"("campus_id");
CREATE INDEX        "user_identity_role_idx"              ON "user_identity"("role");
CREATE INDEX        "user_identity_verification_status_idx" ON "user_identity"("verification_status");

-- SECURITY: admin_service_role has ZERO access to this table (enforced post-migration)
CREATE TABLE "user_private_details" (
    "user_id"         TEXT NOT NULL,
    "email"           VARCHAR(254) NOT NULL,
    "whatsapp_number" VARCHAR(20),
    "personal_email"  VARCHAR(254),
    "totp_secret"     VARCHAR(100),
    "totp_enabled_at" TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_private_details_pkey" PRIMARY KEY ("user_id")
);
CREATE UNIQUE INDEX "user_private_details_email_key" ON "user_private_details"("email");
CREATE INDEX        "user_private_details_email_idx" ON "user_private_details"("email");

-- Auth tables — also off-limits to admin_service_role
CREATE TABLE "auth_credentials" (
    "id"              TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "password_hash"   VARCHAR(200) NOT NULL,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until"    TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "auth_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auth_credentials_user_id_key" ON "auth_credentials"("user_id");

CREATE TABLE "auth_sessions" (
    "id"          TEXT NOT NULL,
    "user_id"     TEXT NOT NULL,
    "token_hash"  VARCHAR(200) NOT NULL,
    "expires_at"  TIMESTAMP(3) NOT NULL,
    "ip_address"  VARCHAR(45),
    "user_agent"  VARCHAR(500),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at"  TIMESTAMP(3),
    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX        "auth_sessions_user_id_idx"    ON "auth_sessions"("user_id");

-- ── 3. SOCIAL GRAPH ──────────────────────────────────────────────────────────

CREATE TABLE "connections" (
    "id"          TEXT NOT NULL,
    "sender_id"   TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status"      "connection_status" NOT NULL DEFAULT 'PENDING',
    "message"     VARCHAR(300),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "connections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "connections_sender_id_fkey"   FOREIGN KEY ("sender_id")   REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "connections_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "connections_sender_id_receiver_id_key" ON "connections"("sender_id", "receiver_id");
CREATE INDEX        "connections_receiver_status_idx"       ON "connections"("receiver_id", "status");
CREATE INDEX        "connections_sender_status_idx"         ON "connections"("sender_id", "status");

CREATE TABLE "user_blocks" (
    "id"           TEXT NOT NULL,
    "initiator_id" TEXT NOT NULL,
    "target_id"    TEXT NOT NULL,
    "reason"       VARCHAR(300),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_blocks_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_blocks_target_id_fkey"    FOREIGN KEY ("target_id")    REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "user_blocks_initiator_id_target_id_key" ON "user_blocks"("initiator_id", "target_id");
CREATE INDEX        "user_blocks_target_id_idx"              ON "user_blocks"("target_id");

-- ── 4. POSTS, GROUPS, GROUP MEMBERS ─────────────────────────────────────────

CREATE TABLE "groups" (
    "id"           TEXT NOT NULL,
    "owner_id"     TEXT NOT NULL,
    "name"         VARCHAR(200) NOT NULL,
    "slug"         VARCHAR(100) NOT NULL,
    "description"  VARCHAR(1000),
    "type"         "group_type" NOT NULL DEFAULT 'OPEN',
    "avatar_url"   VARCHAR(500),
    "member_count" INTEGER NOT NULL DEFAULT 1,
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "groups_slug_key"    ON "groups"("slug");
CREATE INDEX        "groups_owner_id_idx" ON "groups"("owner_id");

CREATE TABLE "posts" (
    "id"                       TEXT NOT NULL,
    "author_id"                TEXT NOT NULL,
    "club_id"                  TEXT,
    "group_id"                 TEXT,
    "type"                     "post_type" NOT NULL DEFAULT 'TEXT',
    "visibility"               "post_visibility" NOT NULL DEFAULT 'PUBLIC',
    "body"                     TEXT,
    "link_url"                 VARCHAR(2000),
    "link_preview_json"        JSONB,
    "image_urls"               TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_orphaned"              BOOLEAN NOT NULL DEFAULT false,
    "orphaned_at"              TIMESTAMP(3),
    "orphaned_by_role_removal" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned"                BOOLEAN NOT NULL DEFAULT false,
    "is_hidden"                BOOLEAN NOT NULL DEFAULT false,
    "hidden_reason"            VARCHAR(300),
    "like_count"               INTEGER NOT NULL DEFAULT 0,
    "comment_count"            INTEGER NOT NULL DEFAULT 0,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMP(3) NOT NULL,
    "deleted_at"               TIMESTAMP(3),
    CONSTRAINT "posts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "posts_club_id_fkey"   FOREIGN KEY ("club_id")   REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "posts_group_id_fkey"  FOREIGN KEY ("group_id")  REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "posts_author_created_idx"     ON "posts"("author_id", "created_at" DESC);
CREATE INDEX "posts_club_created_idx"       ON "posts"("club_id", "created_at" DESC);
CREATE INDEX "posts_group_created_idx"      ON "posts"("group_id", "created_at" DESC);
CREATE INDEX "posts_visibility_created_idx" ON "posts"("visibility", "created_at" DESC);

CREATE TABLE "comments" (
    "id"         TEXT NOT NULL,
    "post_id"    TEXT NOT NULL,
    "author_id"  TEXT NOT NULL,
    "parent_id"  TEXT,
    "body"       VARCHAR(2000) NOT NULL,
    "is_hidden"  BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "comments_post_id_fkey"   FOREIGN KEY ("post_id")   REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "comments_post_created_idx" ON "comments"("post_id", "created_at");
CREATE INDEX "comments_author_idx"       ON "comments"("author_id");

CREATE TABLE "polls" (
    "id"           TEXT NOT NULL,
    "post_id"      TEXT NOT NULL,
    "question"     VARCHAR(500) NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "closes_at"    TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "polls_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "polls_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "polls_post_id_key" ON "polls"("post_id");

CREATE TABLE "poll_options" (
    "id"         TEXT NOT NULL,
    "poll_id"    TEXT NOT NULL,
    "text"       VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- creator_id stored for deduplication — NEVER returned in API responses
CREATE TABLE "poll_entries" (
    "id"         TEXT NOT NULL,
    "option_id"  TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poll_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "poll_entries_option_id_fkey"  FOREIGN KEY ("option_id")  REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "poll_entries_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "poll_entries_option_id_creator_id_key" ON "poll_entries"("option_id", "creator_id");

CREATE TABLE "group_members" (
    "id"        TEXT NOT NULL,
    "group_id"  TEXT NOT NULL,
    "user_id"   TEXT NOT NULL,
    "role"      "group_member_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "group_members_user_id_fkey"  FOREIGN KEY ("user_id")  REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "group_members_group_id_user_id_key" ON "group_members"("group_id", "user_id");
CREATE INDEX        "group_members_user_id_idx"          ON "group_members"("user_id");

-- ── 5. ACHIEVEMENTS, RANKINGS, BRAVE METRICS ────────────────────────────────

CREATE TABLE "achievements" (
    "id"                  TEXT NOT NULL,
    "user_id"             TEXT NOT NULL,
    "title"               VARCHAR(200) NOT NULL,
    "description"         VARCHAR(1000),
    "category"            "achievement_category" NOT NULL,
    "scope"               "achievement_scope" NOT NULL,
    "platform"            VARCHAR(100),
    "proof_url"           VARCHAR(2000),
    "proof_document_url"  VARCHAR(2000),
    "achieved_at"         DATE NOT NULL,
    "verification_status" "achievement_verification_status" NOT NULL DEFAULT 'PENDING',
    "verified_by_id"      TEXT,
    "verified_at"         TIMESTAMP(3),
    "rejection_reason"    VARCHAR(500),
    "external_score"      INTEGER,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMP(3) NOT NULL,
    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "achievements_user_status_idx"     ON "achievements"("user_id", "verification_status");
CREATE INDEX "achievements_category_scope_idx"  ON "achievements"("category", "scope");

CREATE TABLE "achievement_rankings" (
    "id"             TEXT NOT NULL,
    "achievement_id" TEXT NOT NULL,
    "user_id"        TEXT NOT NULL,
    "campus_id"      TEXT,
    "scope"          "achievement_scope" NOT NULL,
    "category"       "achievement_category" NOT NULL,
    "rank"           INTEGER NOT NULL,
    "score"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computed_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "achievement_rankings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "achievement_rankings_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "achievement_rankings_achievement_scope_campus_key" ON "achievement_rankings"("achievement_id", "scope", "campus_id");
CREATE INDEX        "achievement_rankings_campus_scope_cat_rank_idx"    ON "achievement_rankings"("campus_id", "scope", "category", "rank");
CREATE INDEX        "achievement_rankings_user_scope_idx"               ON "achievement_rankings"("user_id", "scope");

CREATE TABLE "brave_metrics" (
    "id"             TEXT NOT NULL,
    "user_id"        TEXT NOT NULL,
    "platform"       VARCHAR(50) NOT NULL,
    "metric_key"     VARCHAR(100) NOT NULL,
    "metric_value"   DOUBLE PRECISION NOT NULL,
    "raw_json"       JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sync_error"     VARCHAR(500),
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "brave_metrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brave_metrics_user_platform_key_key" ON "brave_metrics"("user_id", "platform", "metric_key");
CREATE INDEX        "brave_metrics_user_platform_idx"     ON "brave_metrics"("user_id", "platform");

-- ── 6. CLUBS GOVERNANCE ──────────────────────────────────────────────────────

CREATE TABLE "club_members" (
    "id"        TEXT NOT NULL,
    "club_id"   TEXT NOT NULL,
    "user_id"   TEXT NOT NULL,
    "role"      "club_member_role" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "club_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "club_members_club_id_user_id_key" ON "club_members"("club_id", "user_id");
CREATE INDEX        "club_members_user_id_idx"         ON "club_members"("user_id");
CREATE INDEX        "club_members_club_role_idx"       ON "club_members"("club_id", "role");

CREATE TABLE "club_role_assignments" (
    "id"                  TEXT NOT NULL,
    "club_id"             TEXT NOT NULL,
    "user_id"             TEXT NOT NULL,
    "role"                "club_member_role" NOT NULL,
    "assigned_by_id"      TEXT NOT NULL,
    "revoked_at"          TIMESTAMP(3),
    "revoked_by_id"       TEXT,
    "content_orphaned_at" TIMESTAMP(3),
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "club_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "club_role_assignments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "club_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "club_role_assignments_club_user_idx" ON "club_role_assignments"("club_id", "user_id");
CREATE INDEX "club_role_assignments_user_idx"      ON "club_role_assignments"("user_id", "revoked_at");

CREATE TABLE "suggestion_windows" (
    "id"          TEXT NOT NULL,
    "club_id"     TEXT NOT NULL,
    "title"       VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "opens_at"    TIMESTAMP(3) NOT NULL,
    "closes_at"   TIMESTAMP(3) NOT NULL,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suggestion_windows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suggestion_windows_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "suggestion_windows_club_active_idx" ON "suggestion_windows"("club_id", "is_active");

CREATE TABLE "suggestions" (
    "id"               TEXT NOT NULL,
    "window_id"        TEXT NOT NULL,
    "author_id"        TEXT NOT NULL,
    "title"            VARCHAR(200) NOT NULL,
    "body"             TEXT NOT NULL,
    "vote_count"       INTEGER NOT NULL DEFAULT 0,
    "is_implemented"   BOOLEAN NOT NULL DEFAULT false,
    "implemented_at"   TIMESTAMP(3),
    "implemented_note" VARCHAR(500),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suggestions_window_id_fkey" FOREIGN KEY ("window_id") REFERENCES "suggestion_windows"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "suggestions_window_votes_idx" ON "suggestions"("window_id", "vote_count" DESC);

-- One changeable vote per voter per window — enforced by unique constraint
CREATE TABLE "suggestion_votes" (
    "id"             TEXT NOT NULL,
    "suggestion_id"  TEXT NOT NULL,
    "window_id"      TEXT NOT NULL,
    "voter_id"       TEXT NOT NULL,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suggestion_votes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suggestion_votes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "suggestion_votes_window_voter_key" ON "suggestion_votes"("window_id", "voter_id");
CREATE INDEX        "suggestion_votes_suggestion_idx"   ON "suggestion_votes"("suggestion_id");

-- ── 7. CAMPUS EVENTS ────────────────────────────────────────────────────────

CREATE TABLE "campus_live_alerts" (
    "id"            TEXT NOT NULL,
    "campus_id"     TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title"         VARCHAR(200) NOT NULL,
    "body"          VARCHAR(1000) NOT NULL,
    "severity"      "alert_severity" NOT NULL DEFAULT 'INFO',
    "expires_at"    TIMESTAMP(3),
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campus_live_alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_live_alerts_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "campus_live_alerts_campus_active_idx" ON "campus_live_alerts"("campus_id", "is_active", "created_at" DESC);

CREATE TABLE "campus_cia_schedules" (
    "id"            TEXT NOT NULL,
    "campus_id"     TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "subject"       VARCHAR(200) NOT NULL,
    "component"     VARCHAR(100) NOT NULL,
    "scheduled_at"  TIMESTAMP(3) NOT NULL,
    "venue"         VARCHAR(200),
    "notes"         VARCHAR(500),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campus_cia_schedules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_cia_schedules_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "campus_cia_schedules_campus_date_idx" ON "campus_cia_schedules"("campus_id", "scheduled_at");

CREATE TABLE "campus_ia_exams" (
    "id"            TEXT NOT NULL,
    "campus_id"     TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "subject"       VARCHAR(200) NOT NULL,
    "exam_type"     VARCHAR(100) NOT NULL,
    "scheduled_at"  TIMESTAMP(3) NOT NULL,
    "duration_mins" INTEGER,
    "venue"         VARCHAR(200),
    "syllabus_url"  VARCHAR(500),
    "notes"         VARCHAR(500),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campus_ia_exams_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_ia_exams_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "campus_ia_exams_campus_date_idx" ON "campus_ia_exams"("campus_id", "scheduled_at");

CREATE TABLE "campus_calendars" (
    "id"            TEXT NOT NULL,
    "campus_id"     TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title"         VARCHAR(200) NOT NULL,
    "description"   VARCHAR(1000),
    "event_date"    DATE NOT NULL,
    "end_date"      DATE,
    "event_type"    VARCHAR(100) NOT NULL,
    "is_public"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campus_calendars_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_calendars_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "campus_calendars_campus_date_idx" ON "campus_calendars"("campus_id", "event_date");

-- ── 8. CAMPUS MARKETPLACE ────────────────────────────────────────────────────

CREATE TABLE "campus_market_listings" (
    "id"          TEXT NOT NULL,
    "campus_id"   TEXT NOT NULL,
    "seller_id"   TEXT NOT NULL,
    "title"       VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "price_inr"   DECIMAL(10,2) NOT NULL,
    "condition"   "market_listing_condition" NOT NULL DEFAULT 'GOOD',
    "status"      "market_listing_status" NOT NULL DEFAULT 'ACTIVE',
    "flagged_at"  TIMESTAMP(3),
    "flag_reason" VARCHAR(500),
    "sold_at"     TIMESTAMP(3),
    "view_count"  INTEGER NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campus_market_listings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_market_listings_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "campus_market_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "campus_market_listings_campus_status_idx" ON "campus_market_listings"("campus_id", "status", "created_at" DESC);
CREATE INDEX "campus_market_listings_seller_idx"        ON "campus_market_listings"("seller_id");

CREATE TABLE "campus_market_images" (
    "id"         TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url"        VARCHAR(500) NOT NULL,
    "alt_text"   VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campus_market_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "campus_market_images_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "campus_market_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "campus_market_images_listing_id_idx" ON "campus_market_images"("listing_id");

-- ── 9. NOTIFICATIONS ─────────────────────────────────────────────────────────

CREATE TABLE "notifications" (
    "id"              TEXT NOT NULL,
    "recipient_id"    TEXT NOT NULL,
    "triggered_by_id" TEXT,
    "type"            "notification_type" NOT NULL,
    "title"           VARCHAR(200) NOT NULL,
    "body"            VARCHAR(500),
    "action_url"      VARCHAR(500),
    "is_read"         BOOLEAN NOT NULL DEFAULT false,
    "read_at"         TIMESTAMP(3),
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_recipient_id_fkey"    FOREIGN KEY ("recipient_id")    REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_triggered_by_id_fkey" FOREIGN KEY ("triggered_by_id") REFERENCES "user_identity"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "notifications_recipient_read_idx" ON "notifications"("recipient_id", "is_read", "created_at" DESC);

CREATE TABLE "notification_preferences" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "type"       "notification_type" NOT NULL,
    "in_app"     BOOLEAN NOT NULL DEFAULT true,
    "email"      BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "notification_preferences_user_type_key" ON "notification_preferences"("user_id", "type");

-- ── 10. TRUST & SAFETY / ADMIN ────────────────────────────────────────────────

CREATE TABLE "reports" (
    "id"               TEXT NOT NULL,
    "submitter_id"     TEXT NOT NULL,
    "content_type"     "report_content_type" NOT NULL,
    "post_id"          TEXT,
    "comment_id"       TEXT,
    "listing_id"       TEXT,
    "reported_user_id" TEXT,
    "reason"           VARCHAR(100) NOT NULL,
    "details"          VARCHAR(1000),
    "status"           "report_status" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id"   TEXT,
    "reviewed_at"      TIMESTAMP(3),
    "resolution"       VARCHAR(500),
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reports_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reports_post_id_fkey"      FOREIGN KEY ("post_id")      REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_comment_id_fkey"   FOREIGN KEY ("comment_id")   REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "reports_listing_id_fkey"   FOREIGN KEY ("listing_id")   REFERENCES "campus_market_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "reports_status_created_idx" ON "reports"("status", "created_at" DESC);
CREATE INDEX "reports_submitter_idx"      ON "reports"("submitter_id");

CREATE TABLE "data_deletion_requests" (
    "id"              TEXT NOT NULL,
    "user_id"         TEXT NOT NULL,
    "status"          "deletion_request_status" NOT NULL DEFAULT 'PENDING',
    "requested_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at"    TIMESTAMP(3),
    "completed_at"    TIMESTAMP(3),
    "reviewed_by_id"  TEXT,
    "notes"           VARCHAR(500),
    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "data_deletion_requests_user_idx"   ON "data_deletion_requests"("user_id");
CREATE INDEX "data_deletion_requests_status_idx" ON "data_deletion_requests"("status");

CREATE TABLE "pending_bulk_actions" (
    "id"                TEXT NOT NULL,
    "initiated_by_id"   TEXT NOT NULL,
    "type"              "bulk_action_type" NOT NULL,
    "payload"           JSONB NOT NULL,
    "confirmation_text" VARCHAR(200) NOT NULL,
    "revertable_until"  TIMESTAMP(3) NOT NULL,
    "executed_at"       TIMESTAMP(3),
    "reverted_at"       TIMESTAMP(3),
    "reverted_by_id"    TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_bulk_actions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pending_bulk_actions_initiator_idx"      ON "pending_bulk_actions"("initiated_by_id");
CREATE INDEX "pending_bulk_actions_executed_revert_idx" ON "pending_bulk_actions"("executed_at", "revertable_until");

-- Append-only: admin_service_role & app_service_role have INSERT only, no UPDATE/DELETE
CREATE TABLE "admin_audit_logs" (
    "id"          TEXT NOT NULL,
    "admin_id"    TEXT NOT NULL,
    "action"      VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(100) NOT NULL,
    "target_id"   TEXT NOT NULL,
    "meta_json"   JSONB,
    "ip_address"  VARCHAR(45),
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "user_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "admin_audit_logs_admin_created_idx"  ON "admin_audit_logs"("admin_id", "created_at" DESC);
CREATE INDEX "admin_audit_logs_target_idx"         ON "admin_audit_logs"("target_type", "target_id");
CREATE INDEX "admin_audit_logs_action_created_idx" ON "admin_audit_logs"("action", "created_at" DESC);

-- ── 11. MATERIALIZED VIEW ────────────────────────────────────────────────────
-- Refreshed every 10-15 min by BullMQ worker (Phase 8).
-- Reads from the materialized view, never from live aggregate.

CREATE MATERIALIZED VIEW "success_board_rankings" AS
SELECT
    ar.id             AS ranking_id,
    ar.user_id,
    ui.display_name,
    ui.username,
    ui.avatar_url,
    ui.campus_id,
    ar.campus_id      AS ranking_campus_id,
    ar.scope,
    ar.category,
    ar.rank,
    ar.score,
    COUNT(a.id)       AS verified_achievement_count,
    ar.computed_at
FROM "achievement_rankings" ar
JOIN "user_identity" ui
    ON ar.user_id = ui.id
   AND ui.is_active  = true
   AND ui.is_banned  = false
LEFT JOIN "achievements" a
    ON  a.user_id             = ar.user_id
    AND a.scope               = ar.scope
    AND a.category            = ar.category
    AND a.verification_status = 'VERIFIED'
GROUP BY
    ar.id, ar.user_id, ui.display_name, ui.username,
    ui.avatar_url, ui.campus_id, ar.campus_id,
    ar.scope, ar.category, ar.rank, ar.score, ar.computed_at
WITH NO DATA;

-- Indexes on the materialized view (fast leaderboard reads)
CREATE UNIQUE INDEX "success_board_rankings_id_idx"    ON "success_board_rankings"("ranking_id");
CREATE INDEX        "success_board_rankings_scope_idx" ON "success_board_rankings"("scope", "category", "rank");
CREATE INDEX        "success_board_rankings_campus_idx" ON "success_board_rankings"("ranking_campus_id", "scope", "category", "rank");

-- Initial populate (empty until first sync runs)
-- REFRESH MATERIALIZED VIEW "success_board_rankings";
-- Uncomment after first achievement + ranking rows exist (worker Phase 8).

