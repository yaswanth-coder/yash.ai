@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo              Yash.AI - One-Click Launcher
echo =======================================================
echo.

:: 1. Verify Prerequisites
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python is not installed or not in PATH!
    echo     Please run install.bat first or install Python 3.10+
    pause
    exit /b 1
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed or not in PATH!
    echo     Please run install.bat first or install Node.js 18+
    pause
    exit /b 1
)

:: 2. Auto-create .env if missing
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [V] Auto-created .env from .env.example
    )
)

if not exist "apps\yash-frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > "apps\yash-frontend\.env.local"
)

:: 3. Check virtualenv
set "PYTHON_EXE=python"
if exist "apps\backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=..\venv\Scripts\python.exe"
)

:: 4. Start Backend Server
echo [*] Starting Yash.AI Backend on http://127.0.0.1:8000 ...
start "Yash.AI Backend (FastAPI)" cmd /k "cd apps\backend && %PYTHON_EXE% -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 5. Start Frontend Dev Server
echo [*] Starting Yash.AI Frontend on http://localhost:3000 ...
start "Yash.AI Frontend (Next.js)" cmd /k "cd apps\yash-frontend && npm run dev"

:: 6. Wait for servers to spin up
echo [*] Initializing services, opening browser in 4 seconds...
timeout /t 4 /nobreak >nul

:: 7. Launch Default Browser
echo [*] Opening Yash.AI in your default browser...
start http://localhost:3000

echo.
echo =======================================================
echo   [READY] Yash.AI is now live!
echo.
echo   Frontend:  http://localhost:3000
echo   Backend:   http://127.0.0.1:8000
echo   API Docs:  http://127.0.0.1:8000/docs
echo.
echo   To install as a mobile/desktop app, visit http://localhost:3000
echo   and click "Install App" in your browser or sidebar!
echo =======================================================
echo.
echo Leave this window open while using Yash.AI.
echo Press any key to stop all services and exit...
pause >nul

echo.
echo [*] Shutting down Yash.AI processes...
taskkill /FI "WINDOWTITLE eq Yash.AI Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Yash.AI Frontend*" /T /F >nul 2>&1
echo [V] Services stopped. Have a great day!
timeout /t 2 /nobreak >nul
