#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# Recro — AI Interview System | One-shot Startup Script
# ─────────────────────────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV="$ROOT/backend/agent-sigmoid-venv/bin/python"
FRONTEND="$ROOT/frontend"

# Colours
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Colour

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     🚀  Recro AI Interview System            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# Check venv exists
if [ ! -f "$VENV" ]; then
    echo -e "${RED}❌  Virtual env not found at: $VENV${NC}"
    echo "    Run: python3 -m venv backend/agent-sigmoid-venv && backend/agent-sigmoid-venv/bin/pip install -r requirements.txt"
    exit 1
fi

# Check node / npm
if ! command -v npm &>/dev/null; then
    echo -e "${RED}❌  npm not found. Please install Node.js.${NC}"
    exit 1
fi

# ── Start Backend ────────────────────────────────────────────────────────────
echo -e "${YELLOW}▶  Starting FastAPI backend on port 8000...${NC}"
cd "$ROOT"
"$VENV" -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &> /tmp/recro_backend.log &
BACKEND_PID=$!
echo -e "   Backend PID: ${BACKEND_PID}"

# Wait for backend to be ready
echo -n "   Waiting for backend"
for i in $(seq 1 20); do
    sleep 1
    if curl -s http://localhost:8000/ &>/dev/null; then
        echo -e " ${GREEN}✔${NC}"
        break
    fi
    echo -n "."
    if [ $i -eq 20 ]; then
        echo -e " ${RED}✘  Backend failed to start. Check /tmp/recro_backend.log${NC}"
    fi
done

# ── Start Frontend ───────────────────────────────────────────────────────────
echo -e "${YELLOW}▶  Starting React frontend on port 3000...${NC}"
cd "$FRONTEND"
npm run dev &> /tmp/recro_frontend.log &
FRONTEND_PID=$!
echo -e "   Frontend PID: ${FRONTEND_PID}"
sleep 2

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  All services running!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "  🖥️   Frontend   →  http://localhost:3000"
echo -e "  ⚡   Backend    →  http://localhost:8000"
echo -e "  📖  API Docs   →  http://localhost:8000/docs"
echo -e "  📄  Logs       →  /tmp/recro_backend.log"
echo -e "                    /tmp/recro_frontend.log"
echo ""
echo -e "  Press ${RED}Ctrl+C${NC} to stop all services."
echo ""

# ── Keep alive & handle Ctrl+C ───────────────────────────────────────────────
trap "echo ''; echo -e '${RED}⏹  Stopping all services...${NC}'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo -e '${GREEN}Done.${NC}'; exit 0" INT TERM

wait
