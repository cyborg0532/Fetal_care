<#
.SYNOPSIS
Starts the MaternalCare core backend and Expo frontend in separate windows.

Usage:
  .\start.ps1

Services:
  - Core backend  → http://localhost:8000  (FastAPI CRUD)
  - Frontend      → Expo / Metro (scan QR in the Expo Go app)

The AI microservice (RAG + Ollama) has been decoupled from this build.
AI chat features in the app will show an offline message until reconnected.
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Resolve python — prefer the core_backend venv
$python = Join-Path $root 'core_backend\.venv\Scripts\python.exe'
if (-not (Test-Path $python)) { $python = Join-Path $root '.venv\Scripts\python.exe' }
if (-not (Test-Path $python)) { $python = 'python' }

# 1. Core Backend (port 8000)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location -LiteralPath '$root'; `$env:DATABASE_URL = 'sqlite:///./maternalcare.db'; & '$python' -m uvicorn core_backend.main:app --host 0.0.0.0 --port 8000 --reload"
)

# 2. Frontend (Expo)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location -LiteralPath '$root\frontend'; npm start"
)

Write-Host ""
Write-Host "Core Backend : http://localhost:8000/docs"
Write-Host "Frontend     : Expo / Metro starting in the second window."
Write-Host ""
