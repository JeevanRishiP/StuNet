# StuNet — System Design, Architecture & Desktop-First UX Specification

This document synthesizes the complete UX wireframes, form specifications, multi-portal architecture, and desktop-first interface hierarchy for **StuNet** (Student Community Platform). All previously unfilled sections from the initial planning draft have been thoroughly architected and standardized.

---

## 1. Core Form Specifications

### Form 1: New Student Form (Roster & Onboarding)

- **Administrative Provisioning**: The Campus Admin feeds each student's `USN`, `Student emailID`, `Current Course Year`, `Joined Year`, and `Graduation Year` via Admin Module 11 (Roster Import).
- **Authentication**: Students sign in strictly via Google OAuth matching their pre-provisioned student email ID.
- **Fields**:
  1. `Name` (required)
  2. `USN` (pre-filled from roster, read-only)
  3. `Current Course Year` (pre-filled from roster, editable with admin approval)
  4. `Joined Year` (pre-filled from roster, read-only)
  5. `Graduation Year` (pre-filled from roster, read-only)
  6. `Student Email` (pre-filled via Google login, read-only)
  7. `Personal Email` (optional, protected by visibility boundary)
  8. `Professional Email` (optional)
  9. `WhatsApp Number` (optional, visibility selectable: _All_ vs. _Connected Users_)
  10. `Profile Links` (Linktree-style public pills):
      - Linktree
      - Portfolio Website
      - Instagram
      - YouTube
      - Twitter / X
      - Threads
      - LinkedIn
      - GitHub
      - Hugging Face
      - LeetCode
      - HackerRank
      - Codeforces
      - Kaggle

---

### Form 2: New Faculty Form (Roster & Onboarding)

- **Administrative Provisioning**: The Campus Admin pre-provisions each faculty member's `Employee ID` and `Faculty Email ID`.
- **Authentication**: Faculty members authenticate solely via Google OAuth matching their verified institutional email.
- **Fields**:
  1. `Name` (required)
  2. `NxtWave Employee ID` (pre-filled from roster, read-only)
  3. `Department / School` (e.g. Computer Science & Engineering)
  4. `Designation` (e.g. Professor, Assistant Professor, HOD, Dean)
  5. `Personal Email` (optional)
  6. `Professional / Institutional Email` (pre-filled via Google OAuth)
  7. `WhatsApp / Office Phone Number` (visibility configurable)
  8. `Office Room / Lab Location`
  9. `Profile Links` (Google Scholar, LinkedIn, GitHub, ResearchGate, Portfolio, etc.)

---

### Form 3: New Alumni Form _(Filled Specification)_

- **Administrative Provisioning / Graduation Transition**: When a student's graduation year passes or when campus administration imports historical batches, the account receives the `ALUMNI` role.
- **Fields**:
  1. `Full Name` (required)
  2. `Original Student USN` (verified from historical academic record)
  3. `Graduation Year & Batch` (e.g., _Class of 2024_)
  4. `Current Employment Status`:
     - Working at Company
     - Startup Founder / Entrepreneur
     - Higher Studies / Research (Masters, PhD)
     - Preparing for Competitive Exams / Freelancing
  5. `Current Company / Startup / University Name` (with live Trigram search against `companies`)
  6. `Current Designation / Role` (e.g., _Senior Software Engineer_, _AI Research Fellow_)
  7. `Work Location / City` (e.g., _Bengaluru, San Francisco, London_)
  8. `Personal Email` & `Work Email`
  9. `LinkedIn Profile URL` (required for alumni verification badge)
  10. `WhatsApp Number` (visibility: _All_, _Connected_, _Private_)
  11. `Mentorship Availability Toggle`:
      - Open to mentoring current campus students (Yes / No)
      - Preferred mentoring topics: _Mock Interviews, Resume Reviews, Startup Advisory, Hackathons_
  12. `Profile Links` (GitHub, Portfolio, Substack/Medium, Twitter/X, etc.)

---

### Form 4: New Open-Source Project Form _(Filled Specification)_

- **Purpose**: Showcases student open-source repositories and packages on the Profile and Campus Project Explorer.
- **Automated Metadata Extraction**: When a student provides a GitHub repository URL, the system invokes the backend sync service to automatically extract:
  - Repository Name & Description
  - Synced Stars count & Fork count
  - Primary Programming Language & Tech Stacks
  - Open Issues & Recent Commit Activity
- **Fields**:
  1. `Project Name` (auto-extracted, customizable)
  2. `Short Tagline / Description` (auto-extracted, customizable)
  3. `Primary Platform`: _GitHub_ | _Hugging Face_ | _Kaggle_ | _Other_
  4. `Repository / Model / Dataset URL` (required)
  5. `Live Demo / Website URL` (optional)
  6. `Documentation URL` (optional)
  7. `Tags` (e.g., `#machine-learning`, `#distributed-systems`, `#nextjs`)
  8. `Collaborators / Team Members` (tag other students/faculty on StuNet)
  9. `Auto-Sync Metrics Toggle` (periodically syncs stars and downloads)

---

### Form 5: Update Achievement Form _(Filled Specification)_

- **Purpose**: Powers the Achievement Board and Profile verified badges (Startup, Placement, Internship, Hackathons).
- **Fields**:
  1. `Achievement Category`:
     - _VC Funded Startup / Business_
     - _Campus Placement_
     - _Cracked Internship_
     - _Hackathon / Competition (Winner or Top 3)_
     - _Social Media / Technical Creator (10k+ followers)_
     - _Competitive Programming Milestone (Candidate Master, Knight, etc.)_
     - _Research Paper Publication / Patent_
     - _Other Academic / Community Milestone_
  2. `Title / Headline` (e.g., _Winner — Smart India Hackathon 2026_)
  3. `Organization / Host / Company` (e.g., _Ministry of Education / Google India_)
  4. `Date Achieved` (Month & Year)
  5. `Rank / Position` (1st Place, Runner-Up, Top 3, Finalist, Placed)
  6. `Proof / Verification Evidence`:
     - Offer Letter / Certificate PDF upload or URL
     - Official Winner Announcement Link / News Link
  7. `Detailed Description / Takeaways`
  8. `Associated Team Members` (tag fellow campus contributors)
  9. `Verification Status` (auto-set to _PENDING_; approved by Campus Admin or Campus Manager)

---

### Form 6: New Post Form (Strict Separation from Event Form)

- **Scope**: Clean social & academic post creator (all hackathons/workshops/competitions separated strictly to Event form on `/events`).
- **Audience Targeting**:
  - Connection Scope: _All_ vs. _Connected Only_
  - Role Scope: Multi-select from `[STUDENT, FACULTY, ALUMNI]`
- **Fields**:
  1. `Target User`: _All_ or _Connected Only_
  2. `Target Roles`: _Students_, _Faculty_, _Alumni_ (toggleable chips)
  3. `Title / Subject`: Text input for post title/subject
  4. `Content / Body`: Multiline textarea (Markdown supported)
  5. `Tags`: Comma/space-separated tags with clickable **Trending Tags suggestions** (`#ai`, `#placement`, `#webdev`, `#nxtwave`, `#project`, `#internship`, `#research`, `#study`)
  6. `Anonymous Toggle`: `yes / no` (_"Just labels as Student or Alumni or Faculty in post instead of your name"_)
- **Background Color Coding**:
  - Default: White / slate (standard peer post)
  - Blue (`bg-blue-50/70 border-blue-200 ring-1 ring-blue-100`): Connected 1st-degree peer
  - Gold (`bg-amber-50/75 border-amber-200 ring-1 ring-amber-100`): Alumni post
  - Purple (`bg-purple-50/65 border-purple-200 ring-1 ring-purple-100`): Faculty post
  - Dashed (`bg-slate-50/80 border-dashed border-slate-300`): Anonymous post

---

### Form 7: New Poll Form

- **Audience Targeting**:
  - Connection Scope: _All_ vs. _Connected Only_
  - Role Scope: Multi-select from `[STUDENT, FACULTY, ALUMNI]`
- **Fields**:
  1. `Poll Question / Content` (required)
  2. `Options` (Minimum 2, expandable with `+ Add Option`)
  3. `Tags`
  4. `Anonymous Toggle` (Displays as _"Anonymous Student"_ or _"Anonymous Faculty"_)
  5. `Geo Scope` (All Campuses, My Campus, My City, My State)

---

### Form 8: New Event Information Form (Platform-Wide Events)

- **Scope**: Platform-wide hackathons, workshops, competitions, and meetups distinct from club-internal events.
- **Fields**:
  1. `Event Mode`: _Online_ | _Offline_
  2. `Event Type`: _Hackathon_ | _Competition_ | _Workshop_ | _Meetup_
  3. `Event Name` (required)
  4. `Description`
  5. `Event Date & Time` (required)
  6. `Registration Last Date` (optional)
  7. `Location` (required if _Offline_)
  8. `Tags`

---

### Form 9: New Invite Form (Connections-Only Team-Up Requests)

- **Visibility**: Strictly visible to the creator's accepted 1st-degree connections.
- **Fields**:
  1. `Event Mode`: _Online_ | _Offline_
  2. `Event Type`: _Hackathon_ | _Competition_ | _Project_ | _Workshop_ | _Meetup_
  3. `Requirements / Roles Sought` (e.g. _Frontend Dev with Next.js, ML Engineer with PyTorch_)
  4. `Title / Name`
  5. `Description`
  6. `Event Date`
  7. `Registration Last Date`
  8. `Location` (if _Offline_)
  9. `Expiry Date`

---

### Form 10: New Initiatives Form (Company & Duplicate Prevention)

- **Problem**: Users frequently enter near-duplicates of the same venture or company (e.g., _"Acme Inc"_, _"Acme Inc."_, _"Acme AI Labs"_).
- **Solution**:
  - Hard constraint: `UNIQUE(normalized_name)` where `normalized_name = lower(trim(name))`.
  - Trigram fuzzy duplicate search: As the user types in the company name, debounced query fires against `GET /api/companies/search?q=...` using PostgreSQL `pg_trgm` similarity `%` operator.
  - UX Nudge: Displays _"💡 Did you mean one of these existing initiatives?"_ with match percentages. Clicking an existing company links the user's role to that existing company rather than creating an accidental duplicate.
- **Fields**:
  1. `Company Name` (with live Trigram duplicate detection)
  2. `Description`
  3. `Tags`
  4. `Company Website URL`
  5. `Company LinkedIn URL`
  6. `Owner Type`: _Founder_ | _Co-Founder_
  7. `Position`: Free text (e.g., _CEO & Chief Architect_)

---

## 2. Desktop-First Architecture & Layout Hierarchy

### Global 3-Division Desktop Layout (Instagram & LinkedIn Parity)

For desktop screen viewports ($\ge 1024\text{px}$), the application follows a 3-column architecture with consistent, balanced spacing:

1. **Left Division (Instagram-Style Hover-Reveal Sidebar)**:
   - Base Width: Compact `72px` (displays centered icons/symbols).
   - Hover Behavior: Expands smoothly to `244px` floating towards the right over the page with a subtle shadow (`hover:shadow-2xl hover:border-slate-300 z-50`), revealing text labels, badges, and user profile metadata without displacing the main workspace.
   - Main content padding stays rock-solid at `lg:pl-[72px]`, ensuring Middle & Right divisions have maximum space and stay perfectly centered when zooming out.
2. **Middle Division (Primary Workspace / Feed)**:
   - Width: `w-full max-w-[680px]`
   - Spacing: Centered alongside Right Division with small, consistent LinkedIn-style gap (`gap-6`).
   - Top: Add New Post card opening New Post Form modal (strictly separated from Event form; no hackathons/workshops in feed post form).
   - Primary Stream: 4 Tabs (`Students • All • Faculty • Alumni`).
   - Sub-Filters Bar: 5 items in the exact same single line (`All • Following • Connected • Campus (compact dropdown) • Filters (trending tags)`).
3. **Right Division (Contextual Sidebar & Widgets)**:
   - Width: `320px` fixed
   - Notification Widget: Removed redundant "Live" text; 3 recent 1-line notifications with Title & Description.
   - Campus Event Widget: Only shows events from the Campus Page (academic schedules, CIA/IA dates, campus club events); Sub-tabs: `Today • This Week • This Month`; link: `all campus events >`.
   - Poll Widget: Dynamic polls per section with interactive options; link: `view all polls >`.

---

### Left Sidebar Structure (Desktop)

- **Top Brand**: StuNet NIAT Portal Logo
- **Main Nav Items**:
  - `Home` (`/`)
  - `Search` (Docked Drawer)
  - `My Network` (`/network`) — _Includes unread notification badge on Following & Connected posts_
  - `Achievement Board` (`/success-board`)
  - `Events` (`/events`)
  - `Useful Resources` (`/resources`)
  - `Poll` (`/polls`)
  - _Divider_
  - `My Campus` (`/campus`)
  - `NIAT Clubs` (`/clubs`)
  - `Campus Market (OLX)` (`/marketplace`)
  - `NIAT Insider` (`https://www.niatinsider.com/` — external link)
  - `NIAT Events` (`https://niat-diaries.vercel.app/` — external link)
- **Bottom Pinned Group**:
  - Profile card with avatar, role, and unread notification bell
  - Settings & Theme toggle

### Mobile View Navigation

- For mobile screen viewports ($< 1024\text{px}$), the 5-tab fixed bottom navigation consists of:
  `Home` • `Network` • `Achievement` (formerly labeled Success Board) • `Campus` • `Profile`

---

## 3. Four Portals Architecture

### Portal 1: Student Portal

- Complete access to Home feed, My Network, Clubs, Campus IA/CIA schedules, Marketplace, Polls, and Public Profiles.
- Interacts with connections, registers for hackathons, creates initiatives, and publishes open-source projects.

### Portal 2: Guest Portal

- Restricted guest view for authenticated Google accounts not yet in the institutional roster.
- Allows browsing public posts, success boards, and club descriptions.
- Posting, connecting, and voting are disabled with informative prompt to request enrollment from Campus Admin.

### Portal 3: Alumni Portal _(Filled Specification)_

- **Target Audience**: Graduated students with role `ALUMNI`.
- **Dedicated Alumni Capabilities**:
  1. **Alumni Directory**: Filter by graduation batch, current tech company, industry, or relocation city (e.g. _Bangalore, Bay Area, Europe_).
  2. **Job & Internship Referrals**: Alumni can post internal job openings at their companies directly for current campus students.
  3. **Mentorship Hub**: Manage incoming student 1-on-1 mentorship requests (resume review, technical interview prep, startup feedback).
  4. **Distinguished Alumni Spotlight**: Highlighting funded startup founders, research pioneers, and tier-1 tech engineers.
  5. **Campus Giving & Reunions**: Announcements for annual campus alumni meetups, keynote speaking sessions, and incubation funds.

### Portal 4: Campus Admin Portal _(Filled Specification)_

- **Target Audience**: Campus Administrators, Deans, and Campus Managers.
- **Dedicated Admin Modules**:
  1. **Module 1: Campus Settings & Academic Calendar Configuration**.
  2. **Module 2: Student & Faculty Directory Management**.
  3. **Module 3: Clubs & Leadership Approvals** (Admin designates Club President, Vice President, and Leads).
  4. **Module 4: CIA & IA Academic Publisher** (Timetables, syllabus, question banks, submission deadlines).
  5. **Module 5: Moderation & Reports Queue** (Review reported posts, comments, and profile flags).
  6. **Module 6: Marketplace Moderation** (Approve or ban second-hand campus items).
  7. **Module 7: Achievement Verification** (Approve placement claims, VC funding proof, hackathon certificates).
  8. **Module 8: Audit Logs & Security Boundary Inspector**.
  9. **Module 9: Campus Announcements & Push Broadcasts**.
  10. **Module 10: Analytics & Engagement Telemetry**.
  11. **Module 11: Institutional Roster Import** (CSV bulk-import of USN, Employee ID, email, and graduation year for Google OAuth authorization).

---

## 4. Key Page Wireframe Alignments

### Profile Page (Exact Wireframe Alignment)

Per the wireframe sketch:

- **Orbital Avatar Layout**:
  - Main Avatar circle with `+` action button in top-left corner.
  - Active status indicator (green dot) in top-right corner.
  - **Circle 1 (Bottom-Right of Avatar)**: Displays Primary Venture / Company badge with number `1`, linked to company page, with designation text (e.g. _"Founder"_) beside it.
  - **Circle 2 (Below Avatar)**: Displays Secondary Role / Internship badge with number `2`, with designation text (e.g. _"Intern"_) below it.
- **Identity Box**:
  - Name rendered in bold blue link to portfolio website with external link icon.
  - Role badge (Faculty, Student with USN & Year, or Alumni).
  - Location and University (_S-VYASA University / NIAT_).
  - Star Badge: ⭐ `President • NSC` (Gold star with purple role and club text).
  - Bio box with clickable `369 Connections` link at bottom-left.
- **Public Profile Pills**: Linktree-style pills for GitHub, LeetCode, HackerRank, Codeforces, Kaggle, LinkedIn, etc.
- **7 Navigation Tabs**:
  1. `Achievements` (Startup, Placement, Internship, Hackathons)
  2. `About` (Contact info with privacy controls, public links, unverified achievements)
  3. `Home` (Default: Top 3 achievements carousel, posts preview, projects & tech stacks, GRIT/MINT/BRAVE metrics)
  4. `Projects` (Open-source projects with auto-extracted stars, forks, and tech stack)
  5. `GRIT` (Portal links and leaderboard stats)
  6. `MINT` (Innovation hub milestones)
  7. `Posts` (All author posts with editing options for profile owner)

---

### Achievement Board & Mock Interview Score _(Filled Specification)_

- **Mock Interview Score System**:
  - Evaluation rubric: Technical DSA (25 pts), System Architecture (25 pts), Problem Solving & Logic (25 pts), Behavioral & Communication (25 pts) = **Total Score / 100**.
  - Reviewer: Verified Alumni or Faculty Senior Mentor.
  - Displays percentile rank among campus batch and historical mock progression.
- **Leaderboard Categories**:
  1. _Placed Students & Offers_
  2. _Cracked Tier-1 Internships_
  3. _VC Funded Startups_
  4. _NIAT Competitions (GRIT Challenge Series, BRAVE 1.0 & 2.0)_
  5. _Competitive Programming (Codeforces rating, LeetCode contest rating, HackerRank stars)_
  6. _Open Source (GitHub stars, Hugging Face model downloads, Kaggle Grandmasters)_

---

### NIAT Clubs & Sticky Suggestions Poll

- Live event banner at top: _"Arts Club • Today 3:00 PM • Room 3 First Floor"_.
- Club categories: `NSGC`, `Advanced Tech Club`, `Arts Club`, `Sports Club`, `EDU Club`, `Gen AI Club`, `Media Club`.
- Leadership: President, VP, Operations, Outreach, Finance, Design, Social Media.
- **Right-Hand Sticky Event Suggestion Poll**:
  - Students suggest event topics during an open suggestion window.
  - Club official proposals displayed in distinct highlight color.
  - Real-time descending vote count with single-vote switching until deadline.
