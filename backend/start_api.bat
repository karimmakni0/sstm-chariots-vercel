@echo off
cd /d "%~dp0"
echo Starting SSTM API server on port 3000...
node api.js
pause
