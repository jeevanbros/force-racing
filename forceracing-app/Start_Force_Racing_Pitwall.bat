@echo off
title Force Racing // Pit Wall Operations
color 0c
echo ========================================================
echo        FORCE RACING // TEAM OPERATIONS PIT WALL
echo               KITS WARANGAL (FLASK + SQLITE)
echo ========================================================
echo.
echo Launching Force Racing Operations on http://localhost:5000 ...
echo Press Ctrl+C in this terminal window to stop the server.
echo.

if exist "%~dp0forceracing-app" (
    cd /d "%~dp0forceracing-app"
) else (
    cd /d "C:\Users\ijk11\Desktop\forceracing-app"
)

start http://localhost:5000
python app.py
pause
