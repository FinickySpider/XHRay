@echo off
:: XHRay GitHub Release Script with .env support

:: Load .env if exists
if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (`type .env`) do (
        set %%A=%%B
    )
)

:: Prompt for version tag (e.g., v0.2-pre1)
set /p VERSION=Enter version tag (e.g., v0.2-pre1): 

:: Prompt for release title
set /p TITLE=Enter release title (e.g., XHRay - v0.2-pre1): 

:: Prompt for release description
set /p DESCRIPTION=Enter short release description: 

echo.
echo Version Tag : %VERSION%
echo Title       : %TITLE%
echo Description : %DESCRIPTION%
echo GitHub User : %GITHUB_USERNAME%
echo Repo Name   : %GITHUB_REPO%
pause

:: Git tag and push
git add .
git commit -m "Release %VERSION%"
git tag %VERSION%
git push origin main
git push origin %VERSION%

:: Optional GitHub API upload
set /p DOUPLOAD=Upload to GitHub Releases via API (with .env)? (y/n): 
if /I "%DOUPLOAD%"=="y" (
    if "%GITHUB_USERNAME%"=="" (
        echo ❌ Missing .env config. Please create and fill .env file.
        pause
        exit /b
    )
    set "JSON={\"tag_name\":\"%VERSION%\",\"name\":\"%TITLE%\",\"body\":\"%DESCRIPTION%\",\"draft\":false,\"prerelease\":false}"
    curl -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Content-Type: application/json" ^
     -d "!JSON!" https://api.github.com/repos/%GITHUB_USERNAME%/%GITHUB_REPO%/releases
    echo ✅ GitHub Release API called
)

echo ✅ Release process complete. GitHub Actions will upload artifact shortly.
pause