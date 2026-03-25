#!/bin/bash
#
# Starts the full CanvasCommunities stack:
#   1. PostgreSQL (if not running)
#   2. ML engine (port 8000)
#   3. Next.js dev server (port 3000)
#   4. Runs smoke tests to verify everything works
#
# Usage: ./start.sh
# Stop:  Ctrl+C (kills both servers)

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$ROOT/ml-engine"
WEB_DIR="$ROOT/web-platform"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

cleanup() {
  echo ""
  echo -e "${YELLOW}Shutting down...${NC}"
  kill $ML_PID $WEB_PID 2>/dev/null
  wait $ML_PID $WEB_PID 2>/dev/null
  echo -e "${GREEN}All servers stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}=== CanvasCommunities ===${NC}"
echo ""

# 1. PostgreSQL
echo -e "${YELLOW}[1/4] Checking PostgreSQL...${NC}"
if brew services list 2>/dev/null | grep -q "postgresql.*started"; then
  echo "  PostgreSQL already running"
else
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
  echo "  PostgreSQL started"
  sleep 2
fi

# 2. Kill anything on our ports
lsof -ti:8000 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true

# 3. ML engine
echo -e "${YELLOW}[2/4] Starting ML engine on :8000...${NC}"
cd "$ML_DIR"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/ml-engine.log 2>&1 &
ML_PID=$!

# Wait for ML engine to be ready
for i in {1..15}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}ML engine ready${NC}"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "  ${RED}ML engine failed to start. Check /tmp/ml-engine.log${NC}"
    exit 1
  fi
  sleep 1
done

# 4. Next.js
echo -e "${YELLOW}[3/4] Starting Next.js on :3000...${NC}"
cd "$WEB_DIR"
npm run dev > /tmp/nextjs.log 2>&1 &
WEB_PID=$!

# Wait for Next.js to be ready
for i in {1..30}; do
  if curl -s http://localhost:3000/api/tags > /dev/null 2>&1; then
    echo -e "  ${GREEN}Next.js ready${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "  ${RED}Next.js failed to start. Check /tmp/nextjs.log${NC}"
    exit 1
  fi
  sleep 1
done

# 5. Smoke tests
echo -e "${YELLOW}[4/4] Running smoke tests...${NC}"
echo ""
cd "$WEB_DIR"
npm run test:smoke 2>&1
echo ""

echo -e "${GREEN}=== System running ===${NC}"
echo "  Web app:   http://localhost:3000"
echo "  ML engine: http://localhost:8000/health"
echo "  Dashboard: http://localhost:3000/api/admin/dashboard/pretty"
echo ""
echo "  Press Ctrl+C to stop all servers"

# Keep script alive so Ctrl+C can clean up
wait
