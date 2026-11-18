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

cd /d "%~dp0"
start http://localhost:5000
python app.py
pause
