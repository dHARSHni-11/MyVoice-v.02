@echo off
title MyVoice — AI Grievance System Launcher
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          MyVoice  AI Grievance System                ║
echo  ║          Full-Stack Launcher v1.0                    ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ── Configuration ──────────────────────────────────────────
set ROOT=%~dp0
set NLP_DIR=%ROOT%nlp-service
set BACKEND_DIR=%ROOT%backend
set FRONTEND_DIR=%ROOT%frontend

set NLP_PORT=8002
set BACKEND_PORT=5000
set FRONTEND_PORT=5173

:: ── Step 1: Kill any previous instances ────────────────────
echo  [1/5] Cleaning up previous instances...
taskkill /F /IM "uvicorn.exe" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%NLP_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  [OK] Ports %NLP_PORT%, %BACKEND_PORT%, %FRONTEND_PORT% cleared.
echo.

:: ── Step 2: Check dependencies ─────────────────────────────
echo  [2/5] Checking dependencies...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found. Please install Python 3.9+.
    pause
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install Node.js 18+.
    pause
    exit /b 1
)

echo  [OK] Python and Node.js found.
echo.

:: ── Step 3: Start NLP Service (Python/FastAPI) ─────────────
echo  [3/5] Starting NLP Geocoding ^& Triage Service (port %NLP_PORT%)...
start "NLP Service — port %NLP_PORT%" /D "%NLP_DIR%" cmd /k "title NLP Service [%NLP_PORT%] && color 0B && echo. && echo  Starting NLP Geocoding and Triage Service... && echo. && python -m uvicorn main:app --host 0.0.0.0 --port %NLP_PORT%"
timeout /t 3 /nobreak >nul
echo  [OK] NLP Service launched.
echo.

:: ── Step 4: Start Backend (Node.js/Express) ────────────────
echo  [4/5] Starting Backend API Server (port %BACKEND_PORT%)...
start "Backend API — port %BACKEND_PORT%" /D "%BACKEND_DIR%" cmd /k "title Backend API [%BACKEND_PORT%] && color 0E && echo. && echo  Starting Node.js Backend Server... && echo. && node server.js"
timeout /t 3 /nobreak >nul
echo  [OK] Backend API launched.
echo.

:: ── Step 5: Start Frontend (Vite/React) ────────────────────
echo  [5/5] Starting Frontend Dev Server (port %FRONTEND_PORT%)...
start "Frontend — port %FRONTEND_PORT%" /D "%FRONTEND_DIR%" cmd /k "title Frontend [%FRONTEND_PORT%] && color 0D && echo. && echo  Starting Vite React Frontend... && echo. && npm run dev"
timeout /t 4 /nobreak >nul
echo  [OK] Frontend launched.
echo.

:: ── Done ───────────────────────────────────────────────────
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  All services started successfully!                  ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║   NLP Service:   http://localhost:%NLP_PORT%             ║
echo  ║   Backend API:   http://localhost:%BACKEND_PORT%             ║
echo  ║   Frontend App:  http://localhost:%FRONTEND_PORT%             ║
echo  ║                                                      ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║  Opening browser in 3 seconds...                     ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

timeout /t 3 /nobreak >nul
start "" "http://localhost:%FRONTEND_PORT%"

echo  Press any key to STOP all services...
pause >nul

:: ── Cleanup ────────────────────────────────────────────────
echo.
echo  Shutting down all services...
taskkill /FI "WINDOWTITLE eq NLP Service*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Backend API*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%NLP_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo  [OK] All services stopped. Goodbye!
timeout /t 2 /nobreak >nul
