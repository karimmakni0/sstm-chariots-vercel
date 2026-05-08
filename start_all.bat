@echo off
:: SSTM - Start all services for local production
:: Place a shortcut to this file in:
:: shell:startup  (Win+R → shell:startup)

cd /d "%~dp0"

echo [1/3] Starting PostgreSQL (if not already running)...
net start postgresql-x64-18 >nul 2>&1

echo [2/3] Starting Node API server on port 3000...
start "SSTM API" /min cmd /c "cd /d "%~dp0backend" && node api.js >> "%~dp0logs\api.log" 2>&1"

echo [3/3] Starting Invoice server on port 5000...
start "SSTM Invoice" /min cmd /c "cd /d "%~dp0backend" && py -3 invoice_server.py >> "%~dp0logs\invoice.log" 2>&1"

echo.
echo All services started.
echo   App:     http://localhost  (or http://192.168.1.11)
echo   API:     http://localhost:3000/api/health
echo   Invoice: http://localhost:5000
