@echo off
cd /d "%~dp0"
echo Stopping old server instances...
taskkill /IM python.exe /F >nul 2>&1
taskkill /IM py.exe /F >nul 2>&1
timeout /t 1 /nobreak >nul
echo Starting invoice server...
py -3 invoice_server.py
pause
