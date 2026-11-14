# StuNet — Plan Delta v3

Faculty role, Google OAuth provisioning, new content types, and post engagement (likes, comments, views). This document only covers what changed or was added versus the Admin and Student specs v2 and the Build Instructions doc; everything not mentioned here is unchanged.

## 1. Summary of What Changed

- A new base role, FACULTY, not previously in the role model. Touches login, post/poll targeting, and feed filters.
- The auth model is replaced. The earlier self-signup-with-domain-auto-verify flow is gone. The new model is roster-first: Admin pre-loads each student's USN and each faculty's Employee ID against their institutional email before anyone ever logs in. Login itself is Google OAuth only, and it succeeds only if the authenticated Google account's email matches an unclaimed roster row.
- Several new content types: platform-wide Events, connection-only Invites, Groups, Useful Resources, Companies/Initiatives, Open-Source Projects, and a structured set of public Profile Links.
- Posts and Polls gain two-dimensional audience targeting (connection scope times role scope), an anonymity toggle that labels the author generically instead of by name, and tags.
- Post engagement, the main new ask: Likes, Comments, and Views, stored per-event rather than as bare counters, with an Instagram-style liked-by display that prioritizes people the viewer actually knows.

## 2. Auth Model: Roster-First Provisioning (replaces Build Instructions Phase 2's domain-auto-verify)

**New table, created before any account can exist:**

```sql
CREATE TABLE institutional_roster (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- STUDENT | FACULTY
  identifier TEXT NOT NULL, -- USN for students, Employee ID for faculty
  campus_id UUID NOT NULL REFERENCES campuses(id),
  current_course_year INT, -- STUDENT only
  joined_year INT,
  graduation_year INT, -- STUDENT only
  is_claimed BOOLEAN DEFAULT false,
  created_by_admin_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Flow:**

1. Admin bulk-imports a roster (CSV) into `institutional_roster` via a new Admin Portal module, Roster Import — add this as Admin spec Module 11. Each row is one student or one faculty member, unclaimed.
2. A person visits the Student Portal and signs in with Google only — there is no email/password form, and no self-service signup form of any kind.
3. On first successful Google auth, the backend checks `institutional_roster` for an unclaimed row where `email` matches the Google account's verified email exactly.
4. Match found: create the `user_identity` row (plus `student_academic_details` or `faculty_details`, Section 3), mark the roster row claimed, log the person in. No match: reject the login with a plain message ("This email isn't on your campus's roster yet — ask your campus admin to add you") and do not create an account.
5. Google OAuth should be configured with the `hd` (hosted domain) parameter restricted per campus's email domain where Google Workspace is in use, as a first line of defense; the roster match in step 3 is the actual authorization check and must never be skipped even if `hd` is set, since `hd` alone doesn't verify USN/Employee ID association.

This replaces the entire domain-auto-verify design from the Build Instructions doc's Phase 2 — there is no longer a "pending onboarding" self-signup queue, because nobody can create an account without first existing in the roster.

## 3. Role Model Update

- Add `FACULTY` as a third base role alongside `STUDENT` and `ALUMNI`.
- Split role-specific academic/employment fields out of a single wide table, consistent with the existing personal/institutional data separation:

```sql
CREATE TABLE student_academic_details (
  user_id UUID PRIMARY KEY REFERENCES user_identity(id),
  usn TEXT UNIQUE NOT NULL,
  current_course_year INT,
  joined_year INT,
  graduation_year INT
);

CREATE TABLE faculty_details (
  user_id UUID PRIMARY KEY REFERENCES user_identity(id),
  employee_id TEXT UNIQUE NOT NULL
);
```

- Everywhere the existing specs say "Students or Alumni" for feed filters, audience targeting, or connections, add Faculty as a third option. One open question to confirm with whoever is doing visual design: the existing post-background color rule only defines Default, Blue (connected), and Gold (Alumni) — there's no color specified yet for a Faculty post; pick one before Phase 3 implements the feed.

## 4. New Tables for New Content Types

**Public profile links** (separate from the private contact-info table — these are meant to be publicly visible, like a Linktree, and several of them feed the existing external-sync workers):

```sql
CREATE TABLE profile_links (
  user_id UUID NOT NULL REFERENCES user_identity(id),
  platform TEXT NOT NULL, -- LINKTREE | PORTFOLIO | INSTAGRAM | YOUTUBE | TWITTER | THREADS | LINKEDIN | GITHUB | HUGGINGFACE | LEETCODE | HACKERRANK | CODEFORCES | KAGGLE
  url TEXT NOT NULL,
  PRIMARY KEY (user_id, platform)
);
```

Note: HackerRank is a new addition to the external-sync provider list (Build Instructions, Section 5) — add it alongside Codeforces/LeetCode/GitHub/HuggingFace/Kaggle in the worker's per-provider rate-limit buckets.

**Companies and Initiatives** (powers the Profile page's founder/co-founder badge, and needs duplicate-prevention per the form's own note):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT GENERATED ALWAYS AS (lower(trim(name))) STORED,
  description TEXT,
  website_url TEXT,
  linkedin_url TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (normalized_name)
);
CREATE INDEX companies_name_trgm ON companies USING gin (normalized_name gin_trgm_ops);

CREATE TABLE user_company_roles (
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  owner_type TEXT NOT NULL, -- FOUNDER | CO_FOUNDER
  position TEXT, -- free text, e.g. CEO
  show_on_profile BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, company_id)
);
```

**Duplicate-prevention flow for the agent to implement:** the hard `UNIQUE (normalized_name)` constraint stops exact duplicates outright. For near-duplicates ("Acme Inc" vs "Acme Inc."), the Initiative creation form should query `SELECT name, similarity(normalized_name, $1) FROM companies WHERE normalized_name % $1 ORDER BY similarity(normalized_name, $1) DESC LIMIT 5` (the `pg_trgm` `%` operator) as the user types, and show "Did you mean one of these?" before letting them submit a brand-new company. This is a UX nudge, not a hard block — a genuinely new company should still be creatable.

**Open-source projects:**

```sql
CREATE TABLE open_source_projects (
  id UUID PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  github_url TEXT NOT NULL,
  synced_stars INT, -- populated by the existing GitHub sync worker
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE project_links (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES open_source_projects(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL
);
```

**Events (platform-wide, distinct from Club events and the Admin-managed Campus calendar):**

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  organizer_user_id UUID NOT NULL,
  mode TEXT NOT NULL, -- ONLINE | OFFLINE
  type TEXT NOT NULL, -- HACKATHON | COMPETITION | WORKSHOP | MEETUP
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  location TEXT, -- required only when mode = OFFLINE, enforce in app code
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Professional Invites (connections-only team-up requests — this is the same feature described two ways in the two source documents: the Plan's "My Network > Connections > Professional post" and the Forms doc's "New Invite Form"):**

```sql
CREATE TABLE professional_invites (
  id UUID PRIMARY KEY,
  creator_user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  type TEXT NOT NULL,
  requirements TEXT,
  name TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  registration_deadline TIMESTAMPTZ,
  location TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Visibility rule: visible only to the creator's accepted connections — no selective recipient list, it's simply everyone they're connected to, same as the Plan describes.

**Groups:**

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  short_code TEXT UNIQUE NOT NULL, -- the human-shareable Group ID used to request to join
  name TEXT NOT NULL,
  description TEXT,
  external_link_url TEXT, -- e.g. a WhatsApp group link
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'MEMBER', -- ADMIN | MEMBER
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE group_join_requests (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id),
  user_id UUID NOT NULL,
  purpose TEXT,
  status TEXT DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Useful Resources:**

```sql
CREATE TABLE resources (
  id UUID PRIMARY KEY,
  created_by_user_id UUID NOT NULL,
  category TEXT NOT NULL, -- GITHUB_REPO | BLOG | RESEARCH_PAPER | NEWS_ARTICLE
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Shared polymorphic tags** (posts, polls, events, companies, projects, and resources all have a Tags field — one shared system beats six separate join tables):

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY,
  label TEXT UNIQUE NOT NULL
);
CREATE TABLE taggables (
  tag_id UUID NOT NULL REFERENCES tags(id),
  taggable_type TEXT NOT NULL, -- POST | POLL | EVENT | COMPANY | PROJECT | RESOURCE
  taggable_id UUID NOT NULL,
  PRIMARY KEY (tag_id, taggable_type, taggable_id)
);
```

## 5. Posts and Polls: Targeting, Anonymity, Tags

Both `posts` and `polls` gain the same three additions:

```sql
ALTER TABLE posts ADD COLUMN target_connection_scope TEXT DEFAULT 'ALL'; -- ALL | CONNECTED
ALTER TABLE posts ADD COLUMN target_roles TEXT[] DEFAULT ARRAY['STUDENT','FACULTY','ALUMNI'];
ALTER TABLE posts ADD COLUMN is_anonymous BOOLEAN DEFAULT false;

ALTER TABLE polls ADD COLUMN target_connection_scope TEXT DEFAULT 'ALL';
ALTER TABLE polls ADD COLUMN target_roles TEXT[] DEFAULT ARRAY['STUDENT','FACULTY','ALUMNI'];
ALTER TABLE polls ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
```

Tags on both attach through the shared `taggables` table from Section 4.

**Anonymity rule:** when `is_anonymous = true`, every read path (feed, notifications, search) must render the author as their role label only ("Student", "Faculty", or "Alumni") and must never expose `author_user_id` to the client in that case — same principle as the anonymous-poll pseudonymity rule already in the Admin spec: the ID is retained server-side for moderation, never shown. Comments on an anonymous post are not themselves anonymous by default — the post's anonymity protects the poster, not whoever replies to them. Flag this assumption to the developer before building it in case the intent was different.

**Feed filtering:** the existing "Students • All • Faculty • Alumni" tab filter on Home now reads `target_roles` (does the viewer's role appear in the array) and `target_connection_scope` (if CONNECTED, is the viewer connected to the author) before a post is eligible to show at all — this is a visibility filter, separate from and prior to whatever the Students/All/Faculty/Alumni tab the viewer currently has selected.

## 6. Post Engagement: Likes, Comments, Views

**Schema — stored as events, not bare counters, so the data is there for a future ranking algorithm even though you're not building the algorithm yet:**

```sql
CREATE TABLE post_likes (
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id), -- NULL = top-level, one level of replies supported
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE post_views (
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  first_viewed_at TIMESTAMPTZ DEFAULT now(),
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  view_count INT DEFAULT 1, -- increments on repeat views by the same user; unique viewers = row count
  PRIMARY KEY (post_id, user_id)
);

-- Denormalized counters on posts for fast feed reads, kept correct by triggers rather than app-level increments
ALTER TABLE posts ADD COLUMN like_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN comment_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN view_count INT DEFAULT 0;
```

Use database triggers (`AFTER INSERT/DELETE` on `post_likes` and `post_comments`, `AFTER INSERT` on `post_views`) to maintain `like_count`/`comment_count`/`view_count` on `posts`. Triggers, not application-level increments, because the count then stays correct no matter which code path writes the row — the web app today, a future mobile app, or a background job — without every call site having to remember to update a counter.

**Instagram-style "liked by" display — the specific behavior you described:** When rendering a post's like summary, the candidate pool of names to surface (in priority order, highest first) is:

1. Someone the viewer is connected to, who is FACULTY
2. Someone who is FACULTY at the viewer's own campus (even without a connection)
3. Someone the viewer is connected to, who is STUDENT or ALUMNI
4. Anyone else who liked it

Pick the single highest-priority liker (tie-break by most recent `post_likes.created_at`), and render: `"<Name> liked this"` if `like_count = 1`, or `"<Name> and {like_count - 1} others liked this"` if more. If the candidate pool is empty (nobody the viewer knows liked it), fall back to a plain count: `"{like_count} people liked this"` — this matches how Instagram itself degrades when none of your follows have liked something.

Reference query shape for the agent (one post, one viewer):

```sql
SELECT pl.user_id, ui.name, ui.role,
  CASE
    WHEN c.status = 'ACCEPTED' AND ui.role = 'FACULTY' THEN 1
    WHEN ui.role = 'FACULTY' AND ui.campus_id = :viewer_campus_id THEN 2
    WHEN c.status = 'ACCEPTED' AND ui.role IN ('STUDENT','ALUMNI') THEN 3
    ELSE 4
  END AS priority
FROM post_likes pl
JOIN user_identity ui ON ui.id = pl.user_id
LEFT JOIN connections c ON (c.requester_id = :viewer_id AND c.addressee_id = pl.user_id)
                          OR (c.addressee_id = :viewer_id AND c.requester_id = pl.user_id)
WHERE pl.post_id = :post_id
ORDER BY priority ASC, pl.created_at DESC
LIMIT 1;
```

This is a per-post, per-viewer query — acceptable for a feed at moderate scale, but it's a strong candidate for the Build Instructions' Redis caching layer (Section 5 there) with a short TTL once load testing shows it's hot, since the underlying likes change far less often than the feed is viewed.

**Future ranking algorithm & LinkedIn-style Follow Graph:** Every engagement & interest signal required for personalized ML ranking of posts and polls is persisted as timestamped relational rows:

- `user_follows` (`follower_id`, `following_id`, `source`, `created_at`): One-way asymmetric LinkedIn-style follow interest (distinct from mutual 2-way `connections`, which require request approval). Powers the Home `Following` feed sub-filter and direct creator/topic affinity signals; guarded by Postgres trigger `trg_user_follows_integrity` against self-follows, Guest/banned/inactive users, and `user_blocks`.
- `post_views`, `post_likes`, and `post_comments` (including 1-level replies via `parent_comment_id`): All persist per-user timestamps and counts, protected by `stunet_enforce_post_interaction_access()`.
- `polls`, `poll_options`, `poll_entries` (`poll_id`, `option_id`, `creator_id`, `created_at`), and `poll_submissions` (`(poll_id, user_id)` unique submission lock): Support `allow_multiple_answers` (multi-select) and `submission_mode` (`SINGLE_SUBMIT` with Submit button vs. `MULTIPLE_SUBMIT` without Submit button), enforced at the PostgreSQL trigger level (`trg_poll_entries_rules`, `trg_poll_submissions_rules`). Percentage breakdowns are withheld in both API responses and UI until the user chooses/submits an answer option (`hasVoted = true`).
- **Community Polls Page (`/polls`) Filter & Author Presentation:** Adopts the exact two-row stream and sub-filter system from the Home feed:
  1. _Row 1 (Primary Streams):_ `Students`, `All`, `Faculty`, `Alumni` with role-coded active states (`bg-indigo-600` for Students/All, `bg-purple-600` for Faculty, `bg-amber-600` for Alumni).
  2. _Row 2 (Sub-Filters):_ `All`, `Following` (with unseen indicator dot), `Connected` (with unseen indicator dot), `Campus` (`AdvancedSelectList` compact modal), and `Filters` dropdown with trending topic tags.
  3. _Author Badges:_ When a poll is created by a user with role `FACULTY` or `ALUMNI`, a small pill badge (`Faculty` with `Building2` or `Alumni` with `Award`) is rendered in front of the author's name in the poll card footer. Pseudonymous anonymous polls preserve author identity redaction while displaying the verified role badge appropriately.

## 7. Instructions for the AI Agent — Where This Plugs Into the Existing Build Plan

- **Replace Phase 2 (Auth) entirely** with Section 2 of this document: no self-signup, no password, Google OAuth plus roster match only. Add the Roster Import module to Admin Portal Phase 4 work.
- **Extend Phase 1 (Schema & Migrations)** to include every table in Sections 2, 4, 5, and 6 of this document, in this dependency order: `institutional_roster` → `user_identity`/`student_academic_details`/`faculty_details` → `profile_links` → `tags`/`taggables` → `companies`/`user_company_roles` → `open_source_projects`/`project_links` → `events` → `professional_invites` → `groups`/`group_members`/`group_join_requests` → `resources` → `post_likes`/`post_comments`/`post_views` plus the `posts`/`polls` column additions.
- **Extend Phase 3 (Core Student Portal)** to build Likes, Comments, and Views on the Home feed as part of the same phase that builds posts — don't defer engagement to a later phase, since the counters and triggers are cheapest to get right while the post model is still being actively worked on.
- **New rule for the Non-Negotiable list (Build Instructions, Section 8):** never let an account be created outside the roster-match flow in Section 2, even for test/seed data in non-local environments — seed scripts should insert directly into `institutional_roster` first and go through the same claim flow, not bypass it, so the login path is actually exercised in every environment.
- **Open questions to raise with the developer before building, rather than guessing:** (1) what post background color, if any, Faculty posts get; (2) whether comments should inherit the parent post's anonymity (this document assumes not); (3) whether `professional_invites` should also respect the `target_roles`/`target_connection_scope` pattern from Section 5, or stay connections-only as specified.

## 8. Campus, Polls, and Network Enhancements (2026-11-13 Specifications)

### 8.1 Student Section & Campus Admin Permissions

- **Database Schema**: `user_identity.section VARCHAR(50)` tracks the classroom section (e.g. `Section A`, `Section B`).
- **Authorization**: Read-only for students. Modifiable strictly by users with `CAMPUS_MANAGER` or `SUPER_ADMIN` via `/api/campus/section`.
- **UI Integration**: Rendered on `/campus` top header as `section - [Section Name]` with a pencil edit button visible only to authorized Campus Admins.

### 8.2 Complaint Polls & Enhanced Polls System

- **Database Schema**:
  - `polls.poll_type`: Enum string (`GENERAL`, `COMPLAINT`).
  - `polls.complaint_level`: Enum string (`GENERAL`, `SECTION`, `CAMPUS`).
  - `polls.section`: Target classroom section for section-level grievances.
  - `polls.auto_delete_on_expire`: Boolean indicating whether poll row is purged once `closes_at` passes (strictly prohibited for Complaint Polls).
- **`/polls` Two-Division Grid**:
  - Middle Division (`lg:col-span-8`): General community polls with stream tabs (Students, All, Faculty, Alumni) and sub-filters.
  - Right Division (`lg:col-span-4`): Complaint polls separated into 3 categories: `General` (default selection), `Section Level`, and `Campus Level`.
- **New Poll Modal**:
  - Top toggle for "Community Poll" vs. "Complaint Poll".
  - If Complaint Poll: 3 category options + section identifier input for section-level complaints.
  - Poll Expiration: Calendar date picker (`<input type="date">`) + Digital clock-style time picker (`<input type="time">`).
  - Auto-delete checkbox: "Delete poll after the poll time ends" (hidden for complaint polls).

### 8.3 My Network: Direct Invites & Non-Connected Targeting

- **Database Schema**:
  - `professional_invites.recipient_user_id`: Target user ID when invitation is sent to a specific person.
  - `professional_invites.is_direct_invite`: Flag distinguishing broadcast/feed invites from 1:1 direct targeted invites.
- **New Collaboration Post Modal**:
  - Optional `Event Date` picker.
  - "Send only to selected member" feature:
    - User search input querying `/api/users?query=...` with autocomplete across both connected and non-connected peers.
    - When search input is empty, dynamically displays top interacted connected members as clickable chips.
- **Feed & Filter**:
  - Non-connected invitations tagged with prominent `From Non-Connected Member` badge.
  - Middle feed tab switch: `All Opportunities` vs `Invites from Non-Connected`.

### 8.4 My Campus Page Layout (Wireframe Alignment)

- Realigned layout matching the Excalidraw design:
  - **Top Card**: University Name, `section - [Section Name]` (with admin edit pencil), Academic Calendar button, Campus Faculty button.
  - **Left Division**: Top row of 3 cards (`CIA`, `IA`, `Courses`) with interactive preview drawer, followed by full-width `Poll` card (`General Poll` & `Complaint Poll` with `Campus` and `Section` filters).
  - **Right Division**: `Live campus news slide show`, `Campus notifications` with category filters, and `Upcoming Campus events and academic milestones` (without "Active" badge).

This document, the Admin Portal Spec v2, the Student and Guest Portal Spec v2, and the Build Instructions document together are the complete, current brief.
