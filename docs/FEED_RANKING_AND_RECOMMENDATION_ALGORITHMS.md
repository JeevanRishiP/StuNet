# StuNet — Feed Ranking & Multi-Entity Recommendation Algorithms (v2)

This document provides the definitive specification, architectural design, mathematical formulas, and implementation changelog for the **Personalized Ranking & Recommendation Engine** across StuNet. It covers both the **Feed Ranking System v2 (Hybrid Heuristic + Learned Model)** and its extension to **Polls**, **Events**, **Professional Invites**, and **Useful Resources**.

---

## 1. Executive Summary & Design Principles

### Core Problem

StuNet connects students, faculty, and alumni across universities. A pure chronological feed leads to content stagnation, missed high-value opportunities (hackathons, campus updates, research collaborations), and low engagement. Conversely, a purely learned (black-box ML) model suffers severe cold-start failure on new campuses and risks amplifying clickbait.

### Architectural Solution

StuNet implements a **Hybrid Architecture** combining:

1. **Heuristic Floor ($30\% - 100\%$)**: A deterministic scoring function enforcing relationship proximity (connections, campus, followed creators), tag topic alignment, engagement velocity, and time decay.
2. **Learned Ranking Model ($0\% - 70\%$)**: An offline-trained logistic regression model scoring candidate conversion probability via 13 normalized features, executed natively in TypeScript with zero Python runtime dependency in the serving path.
3. **$\epsilon$-Greedy Exploration Slots**: Reserving 1–2 slots per page for diverse, underexposed, or fresh candidates outside the top-scored set.
4. **Strict Visibility Boundary**: Ranking is **always** executed strictly _after_ database and memory-level multi-tenant security verification (`canViewerAccessPost`). Forbidden posts can never be ranked or served.
5. **Data Volume Gating ($2,000$ Threshold)**: The learned model operates in **Shadow Mode** ($w = 0.0$) until at least 2,000 real production impressions accumulate and validation ROC-AUC reaches $\ge 0.55$.

---

## 2. System Architecture & Component Diagram

```
Serving Path (Next.js / TypeScript)
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Candidate Generation: SQL filter with targetRoles, campus, blocks   │
│ 2. Defense-in-Depth Filter: canViewerAccessPost(viewer, candidate)     │
│ 3. Feature Extraction: author affinity, tag overlap, recency, velocity  │
│ 4. Hybrid Blend: (1 - w) * norm_heuristic + w * model_score            │
│ 5. Exploration Insertion: Interleave epsilon-greedy slots              │
│ 6. Impression Logging: async batch insert into feed_impressions        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
PostgreSQL Database
┌────────────────────────────────────────────────────────────────────────┐
│ • feed_impressions (user_id, post_id, rank, session_id, variant, etc.) │
│ • author_engagement_stats (30-day rolling aggregate per author)        │
│ • user_author_affinity (normalized viewer->author interaction ratio)   │
│ • feed_model_versions (versioned coefficients, training stats, active) │
│ • taggables & tags (polymorphic content tagging across all entities)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                                     ▼
Offline Training & Background Jobs (Worker & ML Trainer)
┌────────────────────────────────────────────────────────────────────────┐
│ • Daily Queue Worker (BullMQ): Aggregates author stats & pair affinity │
│ • Weekly Queue Worker: Spawns apps/ml-trainer/train.py                 │
│ • apps/ml-trainer/train.py (scikit-learn):                             │
│     - 2-hour implicit conversion labeling (likes, comments, views)    │
│     - 13 normalized features                                           │
│     - Chronological 80/20 train/test split                             │
│     - Gates activation on >= 2,000 examples and AUC >= 0.55            │
│     - Serializes coefficients JSON directly into feed_model_versions   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema Specification

### Tables Added in Migrations `002` and `003`

#### 1. `feed_impressions`

Logs every post shown to an authenticated viewer for training data and telemetry.

- `id` (UUID PK)
- `user_id` (UUID FK $\to$ `user_identity.id`, cascade delete)
- `post_id` (UUID FK $\to$ `posts.id`, cascade delete)
- `shown_at` (TIMESTAMPTZ, default `NOW()`)
- `rank_position` (INT, 0-indexed position on page)
- `session_id` (TEXT, links paginated requests in a single viewing session)
- `variant` (TEXT, default `'CONTROL'`, values `'CONTROL'` | `'HYBRID_V2'`)
- `is_exploration` (BOOLEAN, default `false`, tracks $\epsilon$-greedy exploration slots)
- Indexes: `[shown_at, user_id]`, `[post_id, shown_at]`, `[session_id]`, `[variant, shown_at]`, `[is_exploration, shown_at]`.

#### 2. `author_engagement_stats`

Stores rolling 30-day engagement metrics per author, updated daily by background worker.

- `author_user_id` (UUID PK FK $\to$ `user_identity.id`, cascade delete)
- `posts_count_30d` (INT, default 0)
- `avg_likes_per_post_30d` (DECIMAL(10,4), default 0)
- `avg_comments_per_post_30d` (DECIMAL(10,4), default 0)
- `total_views_30d` (INT, default 0)
- `updated_at` (TIMESTAMPTZ, default `NOW()`)

#### 3. `user_author_affinity`

Captures normalized relationship affinity between a viewer and an author based on 90-day interaction history.

- `viewer_user_id` (UUID FK $\to$ `user_identity.id`, cascade delete)
- `author_user_id` (UUID FK $\to$ `user_identity.id`, cascade delete)
- `affinity_score` (DECIMAL(5,4), normalized $0.0000$ to $1.0000$)
- `last_interaction_at` (TIMESTAMPTZ, default `NOW()`)
- Primary Key: `[viewer_user_id, author_user_id]`
- Formula:
  $$\text{affinity\_score}(v, a) = \frac{\text{Interactions}(v \to a)}{\sum_{u} \text{Interactions}(v \to u)}$$
  _(where Interactions = $1.0 \times \text{likes} + 2.0 \times \text{comments}$ within 90 days)._

#### 4. `feed_model_versions`

Maintains versioned model coefficients exported by the Python trainer for instant in-memory loading by the web serving tier.

- `id` (UUID PK)
- `model_name` (TEXT, e.g. `'logistic_regression_v1'`)
- `coefficients_json` (JSONB: `{ features: Record<string, number>, intercept: number, feature_order: string[] }`)
- `training_example_count` (INT)
- `validation_auc` (DECIMAL(6,4))
- `validation_log_loss` (DECIMAL(6,4))
- `is_active` (BOOLEAN, default `false`, only 1 version can be active)
- `trained_at` (TIMESTAMPTZ, default `NOW()`)

---

## 4. Feed Ranking Algorithm Details

### 4.1 Heuristic Formula

For each candidate post $p$ and viewer $v$:

$$\text{HeuristicScore}(p, v) = \frac{\text{RelationshipMultiplier} \times \text{AffinityMultiplier} \times \text{TagMultiplier} \times \text{Engagement}}{\text{RecencyDecay}}$$

Where:

- **Relationship Multiplier**:
  - Direct Accepted Connection: $2.0\times$
  - Followed Creator: $1.6\times$
  - Same Campus: $1.35\times$
  - General Platform: $1.0\times$
- **Affinity Multiplier**:
  $$\text{AffinityMultiplier} = 1.0 + 2.0 \times \text{affinity\_score}(v, p.\text{authorId})$$
- **Tag Multiplier (Creator Tags)**:
  $$\text{tag\_overlap} = \frac{|\text{post\_tags} \cap \text{viewer\_engaged\_tags}|}{|\text{post\_tags}|}$$
  $$\text{TagMultiplier} = 1.0 + 0.5 \times \text{tag\_overlap}$$
- **Engagement Term**:
  $$\text{Engagement} = (\text{likeCount} + 2.0 \times \text{commentCount} + 1.0)$$
- **Recency Decay**:
  $$\text{RecencyDecay} = (\Delta t_{\text{hours}} + 2.0)^{0.8}$$

### 4.2 Learned Model Scoring (Native TypeScript Inference)

The active logistic regression model coefficients are loaded into memory with a 60-second cache TTL. Features $\vec{x}$ are evaluated directly:

$$z = \beta_0 + \sum_{i=1}^{13} \beta_i \cdot x_i$$
$$\text{ModelScore} = \sigma(\text{clamp}(z, -20, 20)) = \frac{1}{1 + e^{-z}}$$

#### The 13 Extracted Features:

| #   | Feature Name             | Description                                                       | Range            |
| --- | ------------------------ | ----------------------------------------------------------------- | ---------------- |
| 1   | `hours_since_posted`     | Elapsed hours since publication                                   | $[0.01, \infty)$ |
| 2   | `like_count`             | Raw likes count                                                   | $[0, \infty)$    |
| 3   | `comment_count`          | Raw comments count                                                | $[0, \infty)$    |
| 4   | `view_count`             | Raw views count                                                   | $[0, \infty)$    |
| 5   | `engagement_velocity`    | $(\text{likes} + 2 \times \text{comments}) / \max(1.0, \Delta t)$ | $[0, \infty)$    |
| 6   | `is_connected`           | Binary indicator: viewer and author are connected                 | $\{0, 1\}$       |
| 7   | `is_same_campus`         | Binary indicator: same campus (non-connection)                    | $\{0, 1\}$       |
| 8   | `user_author_affinity`   | Normalized historical interaction ratio                           | $[0.0, 1.0]$     |
| 9   | `author_engagement_rate` | Author's 30-day average likes per post                            | $[0.0, \infty)$  |
| 10  | `tag_overlap`            | Fraction of post tags matching viewer engaged tags                | $[0.0, 1.0]$     |
| 11  | `hour_of_day`            | UTC hour of impression                                            | $[0, 23]$        |
| 12  | `day_of_week`            | Day of week (0 = Sunday)                                          | $[0, 6]$         |
| 13  | `is_anonymous`           | Binary indicator: post author is anonymous                        | $\{0, 1\}$       |

### 4.3 Hybrid Score Blend & Weight Ramp ($w$)

Heuristic scores are min-max normalized across the candidate batch to $[0.0, 1.0]$:

$$\text{FinalScore} = (1 - w) \times \text{NormHeuristic} + w \times \text{ModelScore}$$

The model weight $w$ smoothly ramps according to verified training volume and AUC:

- If validation AUC $< 0.55$ or $N < 2,000$: $w = 0.0$ (Pure Heuristic Floor)
- If $2,000 \le N < 5,000$: $w = \frac{0.15 \times (N - 2,000)}{3,000}$ (Ramps from $0.0 \to 0.15$)
- If $5,000 \le N < 20,000$: $w = 0.15 + \frac{0.35 \times (N - 5,000)}{15,000}$ (Ramps from $0.15 \to 0.50$)
- If $N \ge 20,000$: $w = \min(0.70, 0.50 + \frac{0.20 \times (N - 20,000)}{30,000})$ (Caps at **$0.70$**, ensuring the heuristic floor always retains at least $30\%$ authority).

### 4.4 Exploration Slots ($\epsilon$-Greedy)

To combat recommendation bubbles and expose fresh creators:

- For pages with $\ge 10$ items, $2$ exploration slots are reserved; for smaller pages, $1$ slot is reserved.
- Exploration candidates are sampled randomly from the candidate pool outside the top $(L - \text{slots})$ set.
- They are interleaved into standard reading positions (e.g. index 4 and index 12).
- Tagged with `is_exploration = true` in `feed_impressions` to measure conversion telemetry independently.

---

## 5. Multi-Entity Recommendation Algorithms

The ranking principles have been extended to all major interactive entities in StuNet.

### 5.1 Polls (`GET /api/polls` via `rankPollCandidates`)

Polls combine debate discovery with urgent voting deadlines.

- **Candidate Pool**: SQL filter on role, geo-scope (Campus/City/State), and tags, strictly validated with `canViewerAccessPost(viewer, poll.post)`.
- **Relationship Boost**: Connected author ($2.0\times$), followed ($1.6\times$), same campus ($1.35\times$).
- **Tag Alignment**: Overlap between poll tags (`taggableType: 'POLL'` and `'POST'`) and viewer's engaged tags ($1.0 + 0.5 \times \text{tag\_overlap}$).
- **Vote & Discussion Engagement**:
  $$\text{Engagement} = \log_2(\text{total\_votes} + 2) \times 2.0 + \text{likeCount} + 2.0 \times \text{commentCount} + 1.0$$
- **Deadline Urgency**: If `closesAt` is within the next 48 hours, apply a **$+30\%$ urgency multiplier** ($1.3\times$).
- **Decay**: $\frac{1}{(\Delta t_{\text{hours}} + 2.0)^{0.8}}$.
- **Exploration**: 1 slot reserved for new or undervoted polls.

### 5.2 Platform Events (`GET & POST /api/events` via `rankEventCandidates`)

Hackathons, workshops, competitions, and meetups require time-sensitive prioritization.

- **Organizer Relationship**: Organizer is connection ($2.0\times$), followed ($1.6\times$), same campus ($1.35\times$).
- **Organizer Affinity**: $1.0 + 2.0 \times \text{affinity\_score}$.
- **Tag Alignment**: Matches event tags (`taggableType: 'EVENT'`) against viewer interests ($1.0 + 0.5 \times \text{tag\_overlap}$).
- **Event Proximity**:
  - Happening in $\le 3$ days: **$1.5\times$**
  - Happening in $4 - 7$ days: **$1.35\times$**
  - Happening in $8 - 14$ days: **$1.15\times$**
- **Registration Deadline Urgency**: If registration closes in $\le 48$ hours, apply **$1.4\times$ multiplier**.
- **Freshness**: Announcement recency decay $\frac{1}{(\Delta t_{\text{hours}} + 2.0)^{0.65}}$.
- **Tag Support**: `POST /api/events` accepts `tags` array and indexes them to `taggables`.

### 5.3 Professional Invites (`GET & POST /api/invites` via `rankInviteCandidates`)

Team-up requests on the My Network page are restricted strictly to accepted connections.

- **Peer Affinity**: High emphasis on frequent collaborators:
  $$\text{AffinityMultiplier} = 1.0 + 3.0 \times \text{affinity\_score}$$
- **Campus Match**: Same campus boost ($1.25\times$).
- **Expiry Urgency**: If the invite expires within 72 hours, apply a **$+35\%$ boost** ($1.35\times$).
- **Freshness**: $\frac{1}{(\Delta t_{\text{hours}} + 2.0)^{0.7}}$.
- **Tag Support**: `POST /api/invites` accepts `tags` array and indexes them to `taggables` (`taggableType: 'PROJECT'`).

### 5.4 Useful Resources (`GET & POST /api/resources` via `rankResourceCandidates`)

GitHub repos, research papers, blogs, and technical news.

- **Creator Relationship**: Connected ($2.0\times$), followed ($1.6\times$), same campus ($1.35\times$).
- **Creator Affinity**: $1.0 + 2.0 \times \text{affinity\_score}$.
- **Tag Alignment**: Strong topic weighting ($1.0 + 0.6 \times \text{tag\_overlap}$).
- **Freshness**: Decay $\frac{1}{(\Delta t_{\text{hours}} + 2.0)^{0.75}}$.
- **Tag Support**: `POST /api/resources` accepts `tags` array and indexes them to `taggables` (`taggableType: 'RESOURCE'`).

---

## 6. Deterministic Rollout & Online Telemetry

### 6.1 Cohort Routing (`resolveUserFeedVariant`)

- Uses a deterministic 32-bit FNV-1a hash mod 100 on `userId`.
- Controlled via environment variable `FEED_HYBRID_ROLLOUT_PERCENT` ($0 - 100$):
  - `0%`: 100% Control (baseline heuristic).
  - `10%`: 10% Hybrid v2, 90% Control.
  - `100%`: 100% Hybrid v2.
- Unauthenticated guests always receive `CONTROL`.
- Debugging & QA override via `?rankingVariant=HYBRID_V2` query parameter or `x-feed-ranking-variant` header.

### 6.2 Online Telemetry Engine (`GET /api/feed/metrics`)

Implemented in [apps/web/src/lib/feed-metrics.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/apps/web/src/lib/feed-metrics.ts):

- **Session Engagement Rate**: Compares the percentage of feed sessions producing at least one engagement (like, comment, view) within 2 hours between `CONTROL` and `HYBRID_V2`.
- **Average Scroll Depth**: Compares the average maximum rank position viewed per session across cohorts.
- **Exploration Conversion Rate**: Computes the conversion rate of exploration slots versus standard ranking slots to verify discovery efficiency.
- **Model Metadata**: Returns active model ID, validation AUC, training sample volume, and current blend weight $w$.

---

## 7. Automated Test Suites & Verification

### Test Coverage Summary

| Package           | Test File                        | Tests | Coverage                                                                                                                                                                                                                                       |
| ----------------- | -------------------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@stunet/db`      | `feed-ranking-v2-schema.test.ts` | 17    | DB schema, permissions, cascading deletes, 30d aggregations, affinity ratios, model weight ramping, native sigmoid evaluation, cohort hash distribution, SQL telemetry aggregation, multi-entity formulas (Polls, Events, Invites, Resources). |
| `@stunet/db`      | `follow-and-poll-rules.test.ts`  | 6     | 1-way follows, poll voting rules, duplicate prevention.                                                                                                                                                                                        |
| `@stunet/db`      | `post-role-isolation.test.ts`    | 9     | Target roles, guest barriers, DB constraints.                                                                                                                                                                                                  |
| `@stunet/db`      | `role-isolation.test.ts`         | 12    | Least privilege service roles (`app_service_role` vs `admin_service_role`).                                                                                                                                                                    |
| `apps/ml-trainer` | `test_train.py`                  | 5     | 13 feature extraction, 2h implicit labeler, chronological 80/20 train/test split, coefficient serialization, threshold gating.                                                                                                                 |
| Monorepo          | `pnpm -r typecheck`              | All   | 100% TypeScript compilation pass across all 7 packages and apps.                                                                                                                                                                               |

---

## 8. Changelog & Implementation History

### Phase 1: Database Foundation & Impression Ingestion

- Created models `FeedImpression`, `AuthorEngagementStats`, `UserAuthorAffinity`, and `FeedModelVersion` in [packages/db/prisma/schema.prisma](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/packages/db/prisma/schema.prisma).
- Generated and executed migration `002_feed_ranking_v2_tables`.
- Granted least-privilege permissions to `app_service_role` in [packages/db/scripts/apply-security-boundaries.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/packages/db/scripts/apply-security-boundaries.ts).
- Wired asynchronous batch impression logging into `GET /api/posts` with `sessionId` and `rankOffset`.

### Phase 2: Rolling Statistics & Affinity Aggregations

- Created daily recurring background worker in [apps/worker/src/queues/feedRankingStats.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/apps/worker/src/queues/feedRankingStats.ts).
- Implemented `refreshAuthorEngagementStats` computing 30-day post counts and average like/comment velocity.
- Implemented `refreshUserAuthorAffinity` calculating normalized pair interactions over total viewer interactions over 90 days.

### Phase 3: Standalone Python ML Trainer

- Built `apps/ml-trainer/` with `train.py` using `scikit-learn` and `psycopg2`.
- Formulated 2-hour implicit positive feedback labeling from `post_likes`, `post_comments`, and `post_views`.
- Implemented chronological 80/20 split and evaluated ROC-AUC and log-loss.
- Enforced shadow mode gating: if impressions $< 2,000$, model is saved with `is_active = false`.
- Scheduled weekly execution job in [apps/worker/src/queues/mlTrainer.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/apps/worker/src/queues/mlTrainer.ts).

### Phase 4: Hybrid Serving Path & Exploration Slots

- Created [apps/web/src/lib/feed-ranking.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/apps/web/src/lib/feed-ranking.ts).
- Cached active model in memory with 60s TTL.
- Evaluated dot-product and clamped sigmoid natively in TypeScript.
- Integrated hybrid score blend with min-max normalized heuristic.
- Added $\epsilon$-greedy exploration slot reservation and insertion.

### Phase 5: Rollout Gating, Telemetry & Multi-Entity Expansion

- Added `variant` and `is_exploration` columns to `feed_impressions` via migration `003_feed_impression_rollout_metrics`.
- Implemented deterministic cohort routing via FNV-1a hash mod 100.
- Built telemetry analytics engine in [apps/web/src/lib/feed-metrics.ts](file:///Users/jeevanriship/StuNet%20-%20Student%20Community/apps/web/src/lib/feed-metrics.ts) exposed at `GET /api/feed/metrics`.
- Extended personalized ranking across **Polls** (`/api/polls`), **Events** (`/api/events`), **My Network Invites** (`/api/invites`), and **Useful Resources** (`/api/resources`).
- Added tag creation and indexing support to Events, Invites, and Resources.
