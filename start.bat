@echo off
setlocal
cd /d "%~dp0"
title Force Racing - Local Preview

echo ========================================================
echo       FORCE RACING REVIVAL - LOCAL PREVIEW (WINDOWS)
echo ========================================================
echo.
echo Starting local preview server on port 8769...
echo Site preview:     http://127.0.0.1:8769/
echo Gale Presenter:   http://127.0.0.1:8769/__present.html
echo (Press P in presenter for Phone frame, L/D for themes)
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYCMD=python
    goto run
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYCMD=py
    goto run
)

echo [ERROR] Neither 'python' nor 'py' was found on your PATH.
echo Please install Python 3 from python.org to run the local preview.
pause
exit /b 1

:run
start "" "http://127.0.0.1:8769/__present.html"
echo Server running. Press Ctrl+C to stop.
echo.
%PYCMD% tools\serve.py 8769 127.0.0.1 site --present tools\present.html
