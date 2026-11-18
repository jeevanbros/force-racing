@echo off
title Force Racing // Pit Wall 32-bit (x86)
cd /d "%~dp0"
if exist "%~dp0ForceRacing-PC-x86.exe" (
    start "" "%~dp0ForceRacing-PC-x86.exe" %*
) else (
    "%~dp0python\python.exe" desktop_launcher.py %*
)
