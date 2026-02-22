# BabyCam.io — Android APK Build Script
# Run this in PowerShell / Tabby from your project root
# Prerequisites: Node.js, Android Studio (with SDK), Java 17+

Write-Host "🍼 BabyCam.io Android Build Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# 1. Check we're in the right directory
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host "❌ Run this from your project root (where capacitor.config.ts is)" -ForegroundColor Red
    exit 1
}

# 2. Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "❌ npm install failed" -ForegroundColor Red; exit 1 }

# 3. Build the web app
Write-Host "`n🔨 Building web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed" -ForegroundColor Red; exit 1 }

# 4. Add Android platform if not present
if (-not (Test-Path "android")) {
    Write-Host "`n📱 Adding Android platform..." -ForegroundColor Yellow
    npx cap add android
}

# 5. Sync web assets to Android
Write-Host "`n🔄 Syncing to Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Cap sync failed" -ForegroundColor Red; exit 1 }

# 6. Build the debug APK using Gradle
Write-Host "`n🏗️  Building APK..." -ForegroundColor Yellow
Push-Location android
if (Test-Path "gradlew.bat") {
    .\gradlew.bat assembleDebug
} else {
    Write-Host "❌ gradlew.bat not found. Open the android folder in Android Studio first." -ForegroundColor Red
    Pop-Location
    exit 1
}
$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -ne 0) {
    Write-Host "❌ APK build failed" -ForegroundColor Red
    exit 1
}

# 7. Locate the APK
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    $size = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
    Write-Host "`n✅ APK built successfully!" -ForegroundColor Green
    Write-Host "📍 Location: $apkPath" -ForegroundColor Green
    Write-Host "📏 Size: ${size} MB" -ForegroundColor Green
    
    # Copy to project root for easy access
    Copy-Item $apkPath "babycam-debug.apk" -Force
    Write-Host "📋 Copied to: babycam-debug.apk" -ForegroundColor Green
    
    Write-Host "`n📲 To install on your phone:" -ForegroundColor Cyan
    Write-Host "   adb install babycam-debug.apk" -ForegroundColor White
    Write-Host "   Or transfer babycam-debug.apk to your phone and tap to install" -ForegroundColor White
} else {
    Write-Host "❌ APK not found at expected path" -ForegroundColor Red
}
