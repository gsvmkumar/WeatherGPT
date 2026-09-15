@echo off
title WeatherGPT Launcher
echo ========================================================
echo               Starting WeatherGPT Stack
echo ========================================================
echo.
echo Starting FastAPI Backend on http://localhost:8000 ...
start "WeatherGPT Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Waiting 3 seconds for backend initialization...
timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend on http://localhost:3000 ...
start "WeatherGPT Frontend" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo ========================================================
echo WeatherGPT is running!
echo Frontend: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo ========================================================
