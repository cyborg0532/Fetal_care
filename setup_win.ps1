# setup_win.ps1 — MaternalCare Setup script for Windows
# Automates Ollama installation, pulling llama3.2:1b, Python environments and NPM setup.

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if ([string]::IsNullOrEmpty($root)) {
    $root = Get-Location
}

Write-Host "=== MaternalCare Setup started in $root ===" -ForegroundColor Green

# 1. Resolve Ollama
$ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaPath)) {
    # Fallback to Program Files
    $ollamaPath = "${env:ProgramFiles}\Ollama\ollama.exe"
}

if (-not (Test-Path $ollamaPath)) {
    Write-Host "[1/5] Ollama is not installed. Downloading Ollama Setup..." -ForegroundColor Cyan
    $installerPath = Join-Path $root "OllamaSetup.exe"
    if (Test-Path $installerPath) {
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    }
    try {
        Write-Host "      Downloading via BitsTransfer..."
        Start-BitsTransfer -Source "https://ollama.com/download/OllamaSetup.exe" -Destination $installerPath
    } catch {
        Write-Host "      BitsTransfer failed. Falling back to Invoke-WebRequest..."
        $oldProgressPreference = $ProgressPreference
        $ProgressPreference = 'SilentlyContinue'
        try {
            Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath
        } finally {
            $ProgressPreference = $oldProgressPreference
        }
    }
    
    Write-Host "[1/5] Installing Ollama silently..." -ForegroundColor Cyan
    # Run silent install and wait for completion
    Start-Process -FilePath $installerPath -ArgumentList "/SP-", "/VERYSILENT", "/NORESTART" -Wait -NoNewWindow
    
    # Resolve path again after install
    $ollamaPath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (-not (Test-Path $ollamaPath)) {
        $ollamaPath = "${env:ProgramFiles}\Ollama\ollama.exe"
    }
    
    # Clean up installer
    Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    Write-Host "      Ollama installed successfully." -ForegroundColor Green
} else {
    Write-Host "[1/5] Ollama is already installed at $ollamaPath." -ForegroundColor Green
}

# 2. Start Ollama Server if not running
$ollamaRunning = $false
try {
    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
    $ollamaRunning = $true
    Write-Host "[2/5] Ollama server is already running." -ForegroundColor Green
} catch {
    Write-Host "[2/5] Ollama server is not running. Starting Ollama server..." -ForegroundColor Cyan
    # Launch serve command in background
    Start-Process -FilePath $ollamaPath -ArgumentList "serve" -NoNewWindow
    # Give it a few seconds to boot up
    Start-Sleep -Seconds 5
}

# 3. Pull model
Write-Host "[3/5] Pulling model llama3.2:1b..." -ForegroundColor Cyan
& $ollamaPath pull llama3.2:1b
Write-Host "      Model pulled successfully." -ForegroundColor Green

# 4. Set up python virtual environments
Write-Host "[4/5] Setting up Python virtual environments..." -ForegroundColor Cyan

# Clean up broken .venv in ai_service if it exists as a file or invalid folder
$aiVenvPath = Join-Path $root "ai_service\.venv"
if (Test-Path $aiVenvPath) {
    Write-Host "      Cleaning up existing .venv reference in ai_service..."
    Remove-Item -Path $aiVenvPath -Recurse -Force -ErrorAction SilentlyContinue
}

# Core Backend Virtual Environment
$coreVenv = Join-Path $root "core_backend\.venv"
if (-not (Test-Path $coreVenv)) {
    Write-Host "      Creating core_backend virtual environment..."
    python -m venv $coreVenv
}
Write-Host "      Installing core_backend dependencies..."
& (Join-Path $coreVenv "Scripts\python.exe") -m pip install --upgrade pip
& (Join-Path $coreVenv "Scripts\python.exe") -m pip install -r (Join-Path $root "core_backend\requirements_win.txt")

# AI Service Virtual Environment
if (-not (Test-Path $aiVenvPath)) {
    Write-Host "      Creating ai_service virtual environment..."
    python -m venv $aiVenvPath
}
Write-Host "      Installing ai_service dependencies..."
& (Join-Path $aiVenvPath "Scripts\python.exe") -m pip install --upgrade pip
& (Join-Path $aiVenvPath "Scripts\python.exe") -m pip install -r (Join-Path $root "ai_service\requirements.txt")

Write-Host "      Python environments are ready." -ForegroundColor Green

# 5. NPM Dependencies
Write-Host "[5/5] Installing frontend npm dependencies..." -ForegroundColor Cyan
Set-Location -Path (Join-Path $root "frontend")
npm install
Set-Location -Path $root

Write-Host "=== Setup completed successfully! ===" -ForegroundColor Green
Write-Host "You can now run: powershell .\run_all.ps1 to start the services." -ForegroundColor Yellow
