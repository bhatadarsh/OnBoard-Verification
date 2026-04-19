#!/bin/bash

# ============================================================
#  AI HirePro Enterprise — One-Command Startup
# ============================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── Load nvm (Node Version Manager) ────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}║       AI HirePro Enterprise  —  Starting...      ║${RESET}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Cleanup on exit ─────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}${BOLD}⏹  Shutting down all services...${RESET}"
  kill "$BACKEND_PID" 2>/dev/null
  kill "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" 2>/dev/null
  wait "$FRONTEND_PID" 2>/dev/null
  echo -e "${GREEN}✓  All services stopped. Goodbye!${RESET}"
  echo ""
  exit 0
}
trap cleanup SIGINT SIGTERM

# ── Backend ─────────────────────────────────────────────────
echo -e "${CYAN}▶  Starting Backend  (FastAPI · port 8000)${RESET}"

# Kill stale processes on our ports
lsof -ti :8000 | xargs kill -9 2>/dev/null
lsof -ti :5173 | xargs kill -9 2>/dev/null

if [ ! -f "$BACKEND/venv/bin/activate" ]; then
  echo -e "${RED}✗  venv not found at $BACKEND/venv — please run:${RESET}"
  echo -e "   cd backend && python3 -m venv venv && pip install -r requirements.txt"
  exit 1
fi

source "$BACKEND/venv/bin/activate"
cd "$BACKEND"
uvicorn app.main:app --reload --reload-dir . --reload-dir ../candidate --reload-dir ../app --reload-dir ../storage --port 8000 2>&1 | sed "s/^/$(printf "${GREEN}[backend]${RESET} ")/" &
BACKEND_PID=$!

# ── Wait for backend to be ready ────────────────────────────
echo -ne "   Waiting for backend..."
for i in $(seq 1 20); do
  sleep 1
  if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo -e "\r   ${GREEN}✓  Backend ready at http://localhost:8000${RESET}      "
    break
  fi
  echo -n "."
done
echo ""

# ── Frontend ────────────────────────────────────────────────
echo -e "${CYAN}▶  Starting Frontend (Vite  · port 5173)${RESET}"

cd "$FRONTEND"
npm run dev 2>&1 | sed "s/^/$(printf "${CYAN}[frontend]${RESET} ")/" &
FRONTEND_PID=$!

sleep 3

# ── Ready banner ────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║              ✓  All Systems Online               ║${RESET}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}${BOLD}║  🌐  App      →  http://localhost:5173           ║${RESET}"
echo -e "${GREEN}${BOLD}║  ⚡  API      →  http://localhost:8000           ║${RESET}"
echo -e "${GREEN}${BOLD}║  📖  Docs     →  http://localhost:8000/docs      ║${RESET}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}${BOLD}║  Press  Ctrl+C  to stop everything               ║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════╝${RESET}"
echo ""

# ── Keep alive ──────────────────────────────────────────────
wait "$BACKEND_PID" "$FRONTEND_PID"
