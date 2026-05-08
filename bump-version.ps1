# bump-version.ps1
# Usage: .\bump-version.ps1 -VersionCode 11 -VersionName "5.2.0"
# VersionName is optional; if omitted, it stays the same.

param(
    [Parameter(Mandatory=$true)]
    [int]$VersionCode,

    [Parameter(Mandatory=$false)]
    [string]$VersionName = ""
)

$appJson    = "app.json"
$buildGradle = "android\app\build.gradle"

# --- Update app.json ---
$appContent = Get-Content $appJson -Raw
$appContent = $appContent -replace '"versionCode":\s*\d+', "`"versionCode`": $VersionCode"
if ($VersionName -ne "") {
    $appContent = $appContent -replace '"version":\s*"[^"]+"', "`"version`": `"$VersionName`""
}
Set-Content $appJson -Value $appContent -NoNewline
Write-Host "✅ app.json      -> versionCode: $VersionCode" -ForegroundColor Green

# --- Update android/app/build.gradle ---
$gradleContent = Get-Content $buildGradle -Raw
$gradleContent = $gradleContent -replace 'versionCode\s+\d+', "versionCode $VersionCode"
if ($VersionName -ne "") {
    $gradleContent = $gradleContent -replace 'versionName\s+"[^"]+"', "versionName `"$VersionName`""
}
Set-Content $buildGradle -Value $gradleContent -NoNewline
Write-Host "✅ build.gradle  -> versionCode: $VersionCode" -ForegroundColor Green

if ($VersionName -ne "") {
    Write-Host "✅ versionName   -> $VersionName" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Done! Now run: eas build --platform android --profile production --non-interactive" -ForegroundColor Cyan
