#!/bin/bash
# ============================================================
# StuNet — Start System
# Double-click in Finder or run from terminal: ./start.command
# ============================================================

# Ensure working directory is the project root
cd "$(dirname "$0")"

echo "=========================================="
echo "       🚀 Starting StuNet System          "
echo "=========================================="
echo ""

# 1. Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "⚠️  Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "Waiting for Docker daemon to initialize..."
    while ! docker info >/dev/null 2>&1; do
        sleep 2
    done
    echo "✓ Docker is running."
    echo ""
fi

# 2. Start container infrastructure (Postgres, Redis, Mailpit)
echo "📦 Starting infrastructure containers (PostgreSQL, Redis, Mailpit)..."
docker compose -f infra/docker-compose.yml up -d

# 3. Wait for database readiness
echo "⏳ Waiting for PostgreSQL (port 5434) to be ready..."
until docker exec stunet_postgres pg_isready -U stunet_owner -d stunet >/dev/null 2>&1; do
    sleep 1
done
echo "✓ Database is healthy."
echo ""

# 4. Display service URLs
echo "=========================================="
echo "  StuNet Services:"
echo "  • Student Portal:   http://localhost:3010"
echo "  • Admin Portal:     http://localhost:3011"
echo "  • Dev Console:      http://localhost:3012"
echo "  • Mailpit (Emails): http://localhost:8026"
echo "=========================================="
echo ""
echo "Starting Next.js applications and background worker..."
echo "Press Ctrl+C at any time to stop the dev servers."
echo ""

# 5. Launch dev servers
pnpm exec turbo dev --ui stream

