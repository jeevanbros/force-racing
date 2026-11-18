@echo off
title Force Racing Operations // Pit Wall 32-bit (x86)
color 0c
cls
echo ======================================================================
echo      FORCE RACING // PIT WALL (32-BIT x86 DESKTOP EDITION)
echo           KITS WARANGAL - FORMULA STUDENT OPERATIONS
echo ======================================================================
echo.
echo Architecture: Windows x86 (32-bit standalone portable)
echo Target Port : 5000 (auto-failover supported)
echo Database    : forceracing_app.db
echo.

cd /d "%~dp0"

if not exist "%~dp0python\python.exe" (
    echo [ERROR] 32-bit Python embedded runtime not found at:
    echo         %~dp0python\python.exe
    echo.
    echo Please ensure the ForceRacing-x86 folder is intact.
    pause
    exit /b 1
)

echo [1/3] Checking 32-bit Python environment...
"%~dp0python\python.exe" -c "import platform, sys; print('     Runtime Architecture:', platform.architecture()[0], '| Python', sys.version.split()[0])"

echo [2/3] Verifying database integrity...
"%~dp0python\python.exe" -c "import database; database.init_db(); print('     Database schema verified: forceracing_app.db')"

echo [3/3] Starting Force Racing Pit Wall Launcher...
echo.
echo Opening http://localhost:5000 in your browser...
echo Close the launcher or press Ctrl+C to terminate.
echo.

if exist "%~dp0ForceRacing-PC-x86.exe" (
    start "" "%~dp0ForceRacing-PC-x86.exe" %*
) else (
    "%~dp0python\python.exe" desktop_launcher.py %*
)
