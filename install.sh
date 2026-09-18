#!/usr/bin/env bash
set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================================${NC}"
echo -e "${BLUE}          Yash.AI - One-Click Installer (Unix)        ${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""

# 1. Check Python 3
echo -e "${YELLOW}[*] Checking Python 3 installation...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[X] python3 could not be found.${NC}"
    echo "Please install Python 3.10+ (e.g. via brew install python or apt install python3 python3-venv)"
    exit 1
fi
echo -e "${GREEN}[V] Found $(python3 --version)${NC}"

# 2. Check Node.js and npm
echo -e "${YELLOW}[*] Checking Node.js and npm...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[X] Node.js could not be found.${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org or via your package manager."
    exit 1
fi
echo -e "${GREEN}[V] Found Node $(node -v) and npm $(npm -v)${NC}"

# 3. Environment configuration
echo ""
echo -e "${YELLOW}[*] Checking environment configurations...${NC}"
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}[V] Created .env from .env.example${NC}"
    fi
else
    echo -e "${GREEN}[V] .env already exists.${NC}"
fi

if [ ! -f "apps/yash-frontend/.env.local" ]; then
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > apps/yash-frontend/.env.local
    echo -e "${GREEN}[V] Created apps/yash-frontend/.env.local${NC}"
else
    echo -e "${GREEN}[V] apps/yash-frontend/.env.local already exists.${NC}"
fi

# 4. Backend Virtual Environment
echo ""
echo -e "${YELLOW}[*] Setting up Python virtual environment...${NC}"
if [ ! -d "apps/backend/venv" ]; then
    python3 -m venv apps/backend/venv
fi

echo -e "${YELLOW}[*] Installing backend dependencies...${NC}"
apps/backend/venv/bin/pip install --upgrade pip > /dev/null 2>&1 || true
apps/backend/venv/bin/pip install -r apps/backend/requirements.txt
echo -e "${GREEN}[V] Backend dependencies installed successfully.${NC}"

# 5. Frontend Dependencies
echo ""
echo -e "${YELLOW}[*] Installing frontend dependencies (npm install)...${NC}"
(cd apps/yash-frontend && npm install)
echo -e "${GREEN}[V] Frontend dependencies installed successfully.${NC}"

echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}     [SUCCESS] Yash.AI Installation Completed!         ${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo "To start Yash.AI, simply run:"
echo -e "  ${GREEN}./start.sh${NC}"
echo ""
