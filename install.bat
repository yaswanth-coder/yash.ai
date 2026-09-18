@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo          Yash.AI - One-Click Installer
echo =======================================================
echo.

:: 1. Check Python
echo [*] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python was not found!
    echo     Please install Python 3.10 or higher from https://www.python.org
    echo     Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [V] Found %%i

:: 2. Check Node.js & npm
echo.
echo [*] Checking Node.js and npm...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js was not found!
    echo     Please install Node.js 18 or higher from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [V] Found Node.js %%i
for /f "tokens=*" %%i in ('npm --version') do echo [V] Found npm %%i

:: 3. Setup .env files
echo.
echo [*] Checking environment configurations...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [V] Created .env from .env.example
    ) else (
        echo [!] .env.example not found, creating default .env
        echo SECRET_KEY=yash_ai_secret_key_change_me_in_production > .env
        echo MONGO_URI=mongodb://localhost:27017/yash_ai >> .env
        echo GEMINI_API_KEY= >> .env
    )
) else (
    echo [V] Root .env already exists.
)

if not exist "apps\yash-frontend\.env.local" (
    echo NEXT_PUBLIC_API_URL=http://localhost:8000 > "apps\yash-frontend\.env.local"
    echo [V] Created apps\yash-frontend\.env.local
) else (
    echo [V] Frontend .env.local already exists.
)

:: 4. Setup Python Virtual Environment for Backend
echo.
echo [*] Setting up Python backend virtual environment...
if not exist "apps\backend\venv" (
    echo [*] Creating virtualenv at apps\backend\venv...
    python -m venv "apps\backend\venv"
    if %errorlevel% neq 0 (
        echo [X] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

echo [*] Installing backend dependencies...
"apps\backend\venv\Scripts\python.exe" -m pip install --upgrade pip >nul 2>&1
"apps\backend\venv\Scripts\pip.exe" install -r "apps\backend\requirements.txt"
if %errorlevel% neq 0 (
    echo [!] Warning: Some backend dependencies encountered issues. Proceeding...
) else (
    echo [V] Backend dependencies installed successfully.
)

:: 5. Install Frontend Dependencies
echo.
echo [*] Installing frontend dependencies (npm install)...
cd "apps\yash-frontend"
call npm install
if %errorlevel% neq 0 (
    echo [!] Warning: npm install encountered issues.
) else (
    echo [V] Frontend dependencies installed successfully.
)
cd "..\.."

echo.
echo =======================================================
echo     [SUCCESS] Yash.AI Installation Completed!
echo =======================================================
echo.
echo You can now launch Yash.AI anytime by double-clicking:
echo   - start.bat
echo.
echo Note: Remember to add your GEMINI_API_KEY inside the .env file!
echo.
pause
