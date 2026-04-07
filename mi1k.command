#!/bin/bash
# Mi1k local launcher — double-click this file from Finder to start
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Starting Mi1k..."
export DATABASE_URL="postgres://paperclip:@localhost:5432/paperclip"

# Check if Postgres is running
if ! pg_isready -q 2>/dev/null; then
  echo "Starting Postgres..."
  brew services start postgresql@17
  sleep 2
fi

# Kill any existing dev server
pkill -f "dev-runner.ts" 2>/dev/null || true
pkill -f "dev-watch.ts" 2>/dev/null || true
sleep 1

# Start dev server
pnpm dev &
DEV_PID=$!

echo ""
echo "Waiting for Mi1k to be ready..."
for i in $(seq 1 40); do
  if curl -sf http://localhost:3100/api/health > /dev/null 2>&1; then
    echo "Mi1k is ready!"
    open http://localhost:3100
    echo ""
    echo "Server running (PID $DEV_PID). Press Ctrl+C to stop."
    wait $DEV_PID
    exit 0
  fi
  echo "  ($i/40) waiting..."
  sleep 3
done

echo "Mi1k did not start in time. Check terminal output above for errors."
