#!/bin/bash
# ============================================================
# StuNet — Stop System
# Double-click in Finder or run from terminal: ./stop.command
# ============================================================

# Ensure working directory is the project root
cd "$(dirname "$0")"

echo "=========================================="
echo "       🛑 Stopping StuNet System          "
echo "=========================================="
echo ""

# 1. Stop application servers listening on StuNet ports (3010, 3011, 3012)
echo "🔍 Checking for running StuNet web applications..."
PIDS=$(lsof -ti :3010 -ti :3011 -ti :3012 2>/dev/null)

if [ -n "$PIDS" ]; then
    echo "Stopping application processes on ports 3010, 3011, 3012 (PIDs: $PIDS)..."
    kill $PIDS 2>/dev/null
    sleep 2
    # Force kill if still lingering
    REMAINING=$(lsof -ti :3010 -ti :3011 -ti :3012 2>/dev/null)
    if [ -n "$REMAINING" ]; then
        kill -9 $REMAINING 2>/dev/null
    fi
    echo "✓ Web applications stopped."
else
    echo "✓ No web applications were running on ports 3010, 3011, 3012."
fi

# 2. Stop any remaining background worker processes
WORKER_PIDS=$(pgrep -f "apps/worker/src/index.ts" 2>/dev/null)
if [ -n "$WORKER_PIDS" ]; then
    echo "Stopping StuNet worker processes..."
    kill $WORKER_PIDS 2>/dev/null
    echo "✓ Worker stopped."
fi

echo ""

# 3. Stop Docker infrastructure
if docker info >/dev/null 2>&1; then
    echo "📦 Stopping Docker infrastructure containers (Postgres, Redis, Mailpit)..."
    docker compose -f infra/docker-compose.yml down
    echo "✓ Containers stopped."
else
    echo "⚠️  Docker is not running; skipping container shutdown."
fi

echo ""
echo "=========================================="
echo "  ✓ StuNet has been completely stopped.   "
echo "=========================================="
echo ""

# Keep Terminal window readable if double-clicked from Finder
read -n 1 -s -r -p "Press any key to close this window..."
echo ""

