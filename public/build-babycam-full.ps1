# ============================================================
# BabyCam.io — FULL Android APK Build Script (PowerShell)
# Paste this ENTIRE script into Tabby PowerShell and hit Enter
# Repo: https://github.com/clyde6205/babycamio.git
# ============================================================

Write-Host "`n🍼 BabyCam.io — Full Android Build" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# ── Step 0: Choose a working directory ──
$projectDir = "$HOME\babycam.io"

# ── Step 1: Check prerequisites ──
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
$nodeInstalled = $false
try { $nodeVersion = node --version 2>$null; $nodeInstalled = $true } catch {}
if (-not $nodeInstalled) {
    Write-Host "❌ Node.js is NOT installed." -ForegroundColor Red
    Write-Host "   👉 Download and install from: https://nodejs.org/ (LTS version)" -ForegroundColor White
    Write-Host "   Then re-run this script.`n" -ForegroundColor White
    exit 1
}
Write-Host "   ✅ Node.js $nodeVersion" -ForegroundColor Green

# Check Java
$javaInstalled = $false
try { $javaVersion = java -version 2>&1 | Select-String "version"; $javaInstalled = $true } catch {}
if (-not $javaInstalled) {
    Write-Host "❌ Java is NOT installed." -ForegroundColor Red
    Write-Host "   👉 Download JDK 17 from: https://adoptium.net/" -ForegroundColor White
    Write-Host "   Then re-run this script.`n" -ForegroundColor White
    exit 1
}
Write-Host "   ✅ Java detected" -ForegroundColor Green

# Check Git
$gitInstalled = $false
try { $gitVersion = git --version 2>$null; $gitInstalled = $true } catch {}
if (-not $gitInstalled) {
    Write-Host "❌ Git is NOT installed." -ForegroundColor Red
    Write-Host "   👉 Download from: https://git-scm.com/downloads" -ForegroundColor White
    exit 1
}
Write-Host "   ✅ $gitVersion" -ForegroundColor Green

# Check for Android SDK
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) { $androidHome = $env:ANDROID_SDK_ROOT }
if (-not $androidHome) { $androidHome = "$env:LOCALAPPDATA\Android\Sdk" }
if (-not (Test-Path "$androidHome\platform-tools")) {
    Write-Host "❌ Android SDK not found." -ForegroundColor Red
    Write-Host "   👉 Install Android Studio from: https://developer.android.com/studio" -ForegroundColor White
    Write-Host "   Open it once, let it download the SDK, then re-run this script." -ForegroundColor White
    exit 1
}
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
Write-Host "   ✅ Android SDK at $androidHome" -ForegroundColor Green

# Add platform-tools to PATH for adb
$env:PATH = "$androidHome\platform-tools;$env:PATH"

Write-Host "`n✅ All prerequisites met!`n" -ForegroundColor Green

# ── Step 2: Clone the repo (or pull latest) ──
if (Test-Path $projectDir) {
    Write-Host "📂 Project folder exists — pulling latest code..." -ForegroundColor Yellow
    Push-Location $projectDir
    git pull origin main
    if ($LASTEXITCODE -ne 0) {
        git pull origin master
    }
    Pop-Location
} else {
    Write-Host "📥 Cloning your GitHub repo..." -ForegroundColor Yellow
    git clone https://github.com/clyde6205/babycamio.git $projectDir
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Git clone failed. Make sure the repo exists and is public (or you're logged into git)." -ForegroundColor Red
        exit 1
    }
}

Push-Location $projectDir
Write-Host "   ✅ Project ready at $projectDir`n" -ForegroundColor Green

# ── Step 3: Install npm dependencies ──
Write-Host "📦 Installing dependencies (this takes 1-2 minutes)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    Pop-Location; exit 1
}
Write-Host "   ✅ Dependencies installed`n" -ForegroundColor Green

# ── Step 4: Build the web app ──
Write-Host "🔨 Building web app..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Pop-Location; exit 1
}
Write-Host "   ✅ Web app built`n" -ForegroundColor Green

# ── Step 5: Add Android platform (fresh each time) ──
Write-Host "📱 Setting up Android platform..." -ForegroundColor Yellow
if (Test-Path "android") {
    Write-Host "   🗑️  Removing old android folder..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "android"
}
npx cap add android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to add Android platform" -ForegroundColor Red
    Pop-Location; exit 1
}
Write-Host "   ✅ Android platform ready`n" -ForegroundColor Green

# ── Step 6: Sync web assets to Android ──
Write-Host "🔄 Syncing web app to Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Cap sync failed" -ForegroundColor Red
    Pop-Location; exit 1
}
Write-Host "   ✅ Synced`n" -ForegroundColor Green

# ── Step 7: Build the APK ──
Write-Host "🏗️  Building APK (this takes 2-5 minutes on first run)..." -ForegroundColor Yellow
Push-Location android

if (Test-Path "gradlew.bat") {
    .\gradlew.bat assembleDebug
} elseif (Test-Path "gradlew") {
    bash ./gradlew assembleDebug
} else {
    Write-Host "❌ Gradle wrapper not found. Open the 'android' folder in Android Studio once, then re-run." -ForegroundColor Red
    Pop-Location; Pop-Location; exit 1
}

$buildResult = $LASTEXITCODE
Pop-Location

if ($buildResult -ne 0) {
    Write-Host "❌ APK build failed. Check the error above." -ForegroundColor Red
    Pop-Location; exit 1
}

# ── Step 8: Locate and copy the APK ──
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apkPath)) {
    Write-Host "❌ APK not found at $apkPath" -ForegroundColor Red
    Pop-Location; exit 1
}

$size = [math]::Round((Get-Item $apkPath).Length / 1MB, 2)
Copy-Item $apkPath "babycam-debug.apk" -Force

Write-Host "`n" -NoNewline
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅  APK BUILT SUCCESSFULLY!                 ║" -ForegroundColor Green
Write-Host "║                                              ║" -ForegroundColor Green
Write-Host "║  📍 File: babycam-debug.apk                  ║" -ForegroundColor Green
Write-Host "║  📏 Size: $size MB                           ║" -ForegroundColor Green
Write-Host "║  📂 Path: $projectDir\babycam-debug.apk      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green

# ── Step 9: Try to install on connected phone ──
Write-Host "`n📲 Checking for connected Android device..." -ForegroundColor Yellow
try {
    $adbDevices = adb devices 2>&1
    $connected = ($adbDevices | Select-String "device$" | Measure-Object).Count

    if ($connected -gt 0) {
        Write-Host "📱 Device found! Installing APK..." -ForegroundColor Green
        adb install -r babycam-debug.apk
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Installed on your phone!" -ForegroundColor Green
            Write-Host "🚀 Launching BabyCam.io..." -ForegroundColor Cyan
            adb shell am start -n "app.lovable.1b7444d59ac1487f9e86e1b166f05b65/.MainActivity"
            Write-Host "`n🍼 BabyCam.io is running on your phone!" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Install failed. Try manually:" -ForegroundColor Yellow
            Write-Host "   adb install babycam-debug.apk" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️  No phone connected via USB." -ForegroundColor Yellow
        Write-Host "   To install later:" -ForegroundColor White
        Write-Host "   1. Connect phone via USB with USB Debugging ON" -ForegroundColor White
        Write-Host "   2. Run: adb install babycam-debug.apk" -ForegroundColor White
        Write-Host "`n   OR transfer babycam-debug.apk to your phone and tap to install." -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  adb not in PATH. Transfer babycam-debug.apk to your phone manually." -ForegroundColor Yellow
}

Pop-Location

Write-Host "`n🎉 DONE! Your BabyCam.io APK is at:" -ForegroundColor Cyan
Write-Host "   $projectDir\babycam-debug.apk`n" -ForegroundColor White
