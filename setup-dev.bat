@echo off
echo Certificate Generator - Local Development Setup
echo ================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo Node.js found!
node --version

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    pause
    exit /b 1
)

echo npm found!
npm --version

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

REM Check if .env file exists
if not exist ".env" (
    echo Creating .env file from template...
    copy ".env.example" ".env"
    echo.
    echo IMPORTANT: Please edit .env file and configure your database settings!
    echo.
)

REM Build the project
echo Building TypeScript...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed! Check for TypeScript errors.
    pause
    exit /b 1
)

echo.
echo ================================
echo Setup completed successfully!
echo ================================
echo.
echo To start the development server:
echo   npm run dev
echo.
echo To start production server:
echo   npm start
echo.
echo Access the application at: http://localhost:3000
echo Enhanced Certificate Builder: http://localhost:3000/templates/builder
echo.

pause