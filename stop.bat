@echo off
setlocal
title Stop Force Racing Preview

echo Stopping any process listening on port 8769...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8769 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>nul
)
echo Server stopped.
timeout /t 2 >nul
