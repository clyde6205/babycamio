# BabyCam.io Local Setup Script
# Run: powershell -ExecutionPolicy Bypass -File setup-babycam.ps1

param(
    [string]$FolderName = "babycam.io"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  BabyCam.io Project Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Git is installed
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git is not installed. Download from https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# Check Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Download from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Set target path
$targetPath = Join-Path (Get-Location) $FolderName

# Clone or pull
if (Test-Path $targetPath) {
    Write-Host "`n[INFO] Folder '$FolderName' already exists. Pulling latest changes..." -ForegroundColor Yellow
    Set-Location $targetPath
    git pull origin main 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] Pull from 'main' failed, trying 'master'..." -ForegroundColor Yellow
        git pull origin master 2>&1
    }
} else {
    Write-Host "`n[INFO] Cloning repository into '$FolderName'..." -ForegroundColor Yellow
    git clone https://github.com/clyde6205/babycam.io.git $FolderName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Clone failed. Check your GitHub access." -ForegroundColor Red
        exit 1
    }
    Set-Location $targetPath
}

Write-Host "[OK] Repository ready at: $targetPath" -ForegroundColor Green

# Install dependencies
Write-Host "`n[INFO] Installing dependencies..." -ForegroundColor Yellow
npm install 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "[WARN] npm install had issues, trying again..." -ForegroundColor Yellow
    npm install --legacy-peer-deps 2>&1
}

# Check for Capacitor (Android build)
if (Test-Path "capacitor.config.ts") {
    Write-Host "`n[INFO] Capacitor detected. Syncing Android..." -ForegroundColor Yellow
    npx cap sync android 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Android synced" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Capacitor sync failed - Android Studio may be needed" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nProject folder: $targetPath" -ForegroundColor White
Write-Host "To start dev server: cd $FolderName && npm run dev" -ForegroundColor White
Write-Host "To update later:     cd $FolderName && git pull" -ForegroundColor White
Write-Host "To build Android:    cd $FolderName && npm run build && npx cap sync android" -ForegroundColor White
Write-Host "`n" -ForegroundColor White
