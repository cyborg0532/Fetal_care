<#!
.SYNOPSIS
Starts the MaternalCare backend and Expo frontend in separate PowerShell windows.
#>

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root 'core_backend\.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    $python = Join-Path $root '.venv\Scripts\python.exe'
}
if (-not (Test-Path $python)) {
    $python = 'python'
}

# 1. Core Backend (port 8000)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location -LiteralPath '$root'; `$env:DATABASE_URL = 'sqlite:///./maternalcare.db'; & '$python' -m uvicorn core_backend.main:app --host 0.0.0.0 --port 8000 --reload"
)

# 2. AI Service (port 8001)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location -LiteralPath '$root'; & '$python' -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8001 --reload"
)

# 3. Frontend (Expo)
Start-Process powershell -ArgumentList @(
    '-NoExit', '-Command',
    "Set-Location -LiteralPath '$root\frontend'; npm start"
)

Write-Host 'Core Backend: http://localhost:8000/docs'
Write-Host 'AI Service: http://localhost:8001'
Write-Host 'Frontend: Expo/Metro is starting in the third window.'
