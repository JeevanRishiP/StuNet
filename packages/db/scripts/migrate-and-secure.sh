#!/usr/bin/env bash
# ============================================================
# packages/db/scripts/migrate-and-secure.sh
# Runs Prisma migrations then immediately applies security
# boundary revokes so the DB is always in the correct state.
# Usage: bash packages/db/scripts/migrate-and-secure.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "▶ Running Prisma migrations..."
cd "$DB_ROOT"
pnpm exec prisma migrate deploy

echo "▶ Applying DB security boundaries..."
DATABASE_OWNER_URL="${DATABASE_OWNER_URL:-$DATABASE_URL}" \
  pnpm exec tsx scripts/apply-security-boundaries.ts

echo "✅ Migrations and security boundaries applied."
