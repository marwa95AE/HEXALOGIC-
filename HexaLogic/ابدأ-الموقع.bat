@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not on PATH.
  echo Install Node.js 22.13 or later, then try again.
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($health.status -eq 'ok') { exit 0 } } catch {}; exit 1"
if not errorlevel 1 (
  echo The website is already running. Opening it in your browser.
  start "" "http://127.0.0.1:3000"
  exit /b 0
)

start "" powershell -NoProfile -WindowStyle Hidden -Command "$deadline = (Get-Date).AddSeconds(30); while ((Get-Date) -lt $deadline) { try { $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; if ($health.status -eq 'ok') { Start-Process 'http://127.0.0.1:3000'; exit 0 } } catch {}; Start-Sleep -Milliseconds 500 }"
node backend\server.js
if errorlevel 1 pause
