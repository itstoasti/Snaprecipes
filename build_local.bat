@echo off
echo Mapping current directory to S: drive...
subst S: /D >nul 2>&1
subst S: %CD%
if errorlevel 1 (
    echo [ERROR] Failed to map S: drive.
    exit /b 1
)

echo Switching to S: drive and building...
S:
cd android
call gradlew.bat assembleRelease 2>&1

echo Cleaning up S: drive...
subst S: /D
