@echo off
:: XHRay Version Bump and Release Script

setlocal EnableDelayedExpansion

:: Read most recent version tag from Git
for /f "delims=" %%i in ('git describe --tags --abbrev=0') do set CURRENT_VERSION=%%i
echo Detected latest version: %CURRENT_VERSION%

:: Parse major.minor-patch from current version
for /f "tokens=1,2 delims=v-" %%a in ("%CURRENT_VERSION%") do (
    set VERSION_NUM=%%a
    set RELEASE_SUFFIX=%%b
)

:: Split major.minor.patch
for /f "tokens=1,2,3 delims=." %%i in ("%VERSION_NUM%") do (
    set MAJOR=%%i
    set MINOR=%%j
    set PATCH=%%k
)

echo.
echo Current Version: v%MAJOR%.%MINOR%.%PATCH%-%RELEASE_SUFFIX%
echo.

echo Choose what to bump:
echo 1. Major (v%MAJOR%.%MINOR%.%PATCH% → v%MAJORplus%.0.0)
echo 2. Minor (v%MAJOR%.%MINOR%.%PATCH% → v%MAJOR%.%MINORplus%.0)
echo 3. Patch (v%MAJOR%.%MINOR%.%PATCH% → v%MAJOR%.%MINOR%.%PATCHplus%)
echo 4. Pre-release (v%MAJOR%.%MINOR%-preX)
echo 5. Beta (v%MAJOR%.%MINOR%-betaX)
echo 6. Release Candidate (v%MAJOR%.%MINOR%-rcX)
set /p BUMP=Enter selection (1-6): 

:: Increment logic
set /a MAJORplus=MAJOR+1
set /a MINORplus=MINOR+1
set /a PATCHplus=PATCH+1

set NEW_VERSION=

if "%BUMP%"=="1" set NEW_VERSION=v%MAJORplus%.0.0
if "%BUMP%"=="2" set NEW_VERSION=v%MAJOR%.%MINORplus%.0
if "%BUMP%"=="3" set NEW_VERSION=v%MAJOR%.%MINOR%.%PATCHplus%
if "%BUMP%"=="4" (
    set /p PREN=Enter pre-release number: 
    set NEW_VERSION=v%MAJOR%.%MINOR%-pre%PREN%
)
if "%BUMP%"=="5" (
    set /p BETAN=Enter beta version number: 
    set NEW_VERSION=v%MAJOR%.%MINOR%-beta%BETAN%
)
if "%BUMP%"=="6" (
    set /p RCN=Enter RC version number: 
    set NEW_VERSION=v%MAJOR%.%MINOR%-rc%RCN%
)

echo.
echo New Version: %NEW_VERSION%
pause

:: Git tag and push
git add .
git commit -m "Release %NEW_VERSION%"
git tag %NEW_VERSION%
git push origin main
git push origin %NEW_VERSION%

:: Optional GitHub Release
set /p DOUPLOAD=Upload to GitHub Releases via API (y/n)?: 
if /I "%DOUPLOAD%"=="y" (
    if not exist ".env" (
        echo ❌ Missing .env file with credentials.
        pause
        exit /b
    )

    for /f "usebackq tokens=1,* delims==" %%A in (`type .env`) do (
        set %%A=%%B
    )

    set /p TITLE=Enter release title: 
    set /p DESCRIPTION=Enter release description: 
    set "JSON={\"tag_name\":\"%NEW_VERSION%\",\"name\":\"%TITLE%\",\"body\":\"%DESCRIPTION%\",\"draft\":false,\"prerelease\":false}"
    curl -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Content-Type: application/json" ^
     -d "!JSON!" https://api.github.com/repos/%GITHUB_USERNAME%/%GITHUB_REPO%/releases
    echo ✅ GitHub Release API called
)

:: Update CHANGELOG.md header to match new version
echo Updating CHANGELOG.md...

set NEW_HEADER=## [%NEW_VERSION%] - %DATE%
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
  set DATE=%%c-%%a-%%b
)

setlocal enabledelayedexpansion
(
    echo ## [%NEW_VERSION%] - !DATE!
    echo.
    echo ### Added
    echo - TODO: Add feature descriptions here
    echo.
    echo ### Fixed
    echo - TODO: Add bugfixes here
    echo.
    type CHANGELOG.md
) > temp_changelog.md

move /Y temp_changelog.md CHANGELOG.md >nul

echo Running auto-changelog...
bash ./scripts/generate-changelog.sh
echo ✅ Release v%NEW_VERSION% complete.
pause