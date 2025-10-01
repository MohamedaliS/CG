@echo off
echo Certificate Generator - GitHub Push Script
echo ==========================================

REM Check if Git is available
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed or not in PATH!
    echo.
    echo Please install Git:
    echo 1. Download from: https://git-scm.com/download/windows
    echo 2. Or install via winget: winget install Git.Git
    echo 3. Restart command prompt after installation
    echo.
    pause
    exit /b 1
)

echo Git found!
git --version

REM Check if this is a Git repository
if not exist ".git" (
    echo ERROR: Not a Git repository!
    set /p init="Initialize Git repository? (y/N): "
    if /i "%init%"=="y" (
        git init
        echo Git repository initialized
    ) else (
        exit /b 1
    )
)

echo.
echo Current Git status:
git status --short

REM Add all files
echo.
echo Staging all changes...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to stage changes!
    pause
    exit /b 1
)

REM Get commit message
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" (
    set commit_msg=feat: Enhanced certificate builder with HTMX integration
)

REM Commit changes
echo.
echo Committing changes...
git commit -m "%commit_msg%"
if %errorlevel% neq 0 (
    echo ERROR: Failed to commit changes!
    pause
    exit /b 1
)

REM Check remote
git remote -v | findstr /C:"origin" >nul
if %errorlevel% neq 0 (
    echo.
    echo No remote repository configured.
    set /p remote_url="Enter GitHub repository URL: "
    if not "%remote_url%"=="" (
        git remote add origin "%remote_url%"
        if %errorlevel% neq 0 (
            echo ERROR: Failed to add remote origin!
            pause
            exit /b 1
        )
    )
)

REM Push to GitHub
echo.
echo Pushing to GitHub...
for /f "delims=" %%i in ('git branch --show-current') do set branch=%%i
git push -u origin %branch%

if %errorlevel% equ 0 (
    echo.
    echo SUCCESS: Code pushed to GitHub!
    echo Your enhanced certificate builder is now on GitHub!
) else (
    echo.
    echo ERROR: Failed to push to GitHub!
    echo This might be due to authentication or permission issues.
    echo Consider using GitHub Desktop for easier authentication.
)

echo.
pause