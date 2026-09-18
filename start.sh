#!/usr/bin/env bash

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}              Yash.AI - One-Click Launcher             ${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

# Ensure all background jobs are cleaned up on script termination
trap 'echo -e "\n${YELLOW}[*] Stopping Yash.AI services...${NC}"; kill 0' EXIT SIGINT SIGTERM

# Check Python and Node
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[X] python3 not found. Please run ./install.sh first.${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}[X] Node.js not found. Please run ./install.sh first.${NC}"
    exit 1
fi

# Detect python binary
PYTHON_BIN="python3"
if [ -f "apps/backend/venv/bin/python" ]; then
    PYTHON_BIN="apps/backend/venv/bin/python"
fi

# 1. Start Backend
echo -e "${YELLOW}[*] Starting Yash.AI Backend on http://127.0.0.1:8000 ...${NC}"
(cd apps/backend && $PYTHON_BIN -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
BACKEND_PID=$!

# 2. Start Frontend
echo -e "${YELLOW}[*] Starting Yash.AI Frontend on http://localhost:3000 ...${NC}"
(cd apps/yash-frontend && npm run dev) &
FRONTEND_PID=$!

# 3. Wait 4 seconds for services
sleep 4

# 4. Open default browser
if command -v open &> /dev/null; then
    open "http://localhost:3000"
elif command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:3000" &> /dev/null
fi

echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}   [READY] Yash.AI is live!                            ${NC}"
echo ""
echo -e "   ${CYAN}Frontend:${NC}  http://localhost:3000"
echo -e "   ${CYAN}Backend:${NC}   http://127.0.0.1:8000"
echo -e "   ${CYAN}API Docs:${NC}  http://127.0.0.1:8000/docs"
echo ""
echo -e "   Press ${YELLOW}Ctrl+C${NC} to stop all services and exit."
echo -e "${GREEN}=======================================================${NC}"
echo ""

# Wait indefinitely until interrupted
wait
