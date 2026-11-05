# StuNet - Campus-Centric Student Community Platform

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

StuNet is a multi-campus, campus-centric student community platform designed for higher education institutions. It connects students, faculty, clubs, and campus administrators within unified verified campus hubs.

---

## 🏛️ Architecture & Workspace Structure

StuNet is structured as a high-performance monorepo powered by **Turborepo** and **pnpm**:

```
.
├── apps/
│   ├── web/        # Main student web app (Next.js 14 App Router, NextAuth, Tailwind)
│   ├── admin/      # Campus administrator portal (Directory, approvals, analytics)
│   ├── dev/        # Internal developer & ops dashboard (Sandbox, queues, seeders)
│   └── worker/     # Background jobs and notifications worker
├── packages/
│   ├── db/         # Prisma schema, migrations, and database client
│   ├── ui/         # Shared design system components
│   ├── types/      # Shared TypeScript types, schemas, and validation utilities
│   └── config/     # Shared ESLint, Tailwind, and TypeScript configurations
├── infra/          # Docker Compose configurations (Postgres, MinIO, Redis)
└── LICENSE         # Apache License 2.0
```

---

## 🚀 Key Features

- **Multi-Campus Isolation & Discovery:** Full support for 40+ campuses with distinct clubs, official student directories, and academic cohorts.
- **Campus Verified Directories & Enrollment:** Roll number and institutional email-based verification with academic year calculation.
- **Clubs & Communities:** Official campus clubs (Coding, Robotics, Design, Cultural, Sports, etc.) with role-based member management.
- **Interactive Feed & Discussions:** Campus feeds, post filtering, rich media, and engagement metrics.
- **Admin & Developer Consoles:**
  - `apps/admin`: Campus directory management, student onboarding, approvals, and faculty hubs.
  - `apps/dev`: Developer operational toolkit, raw query sandboxes, queue inspectors, and seeding tools.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Monorepo Management:** [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/)
- **Database & ORM:** PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **Authentication:** [NextAuth.js (Auth.js)](https://authjs.dev/) with credential and session management
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Validation:** [Zod](https://zod.dev/)

---

## 🏁 Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker & Docker Compose (for local database and infrastructure services)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/JeevanRishiP/StuNet.git
   cd StuNet
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   cp apps/admin/.env.example apps/admin/.env.local
   cp apps/dev/.env.example apps/dev/.env.local
   ```

4. Start infrastructure (Postgres, MinIO):

   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```

5. Push the database schema & seed initial data:

   ```bash
   pnpm --filter @stunet/db db:push
   pnpm --filter @stunet/db db:seed
   ```

6. Start all applications in development mode:
   ```bash
   pnpm dev
   ```

---

## 📄 License

This project is licensed under the [Apache License, Version 2.0](LICENSE).
