# Certificate Generator - PowerShell Setup Script
Write-Host "Certificate Generator - Local Development Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check Node.js
Write-Host "`nChecking Node.js installation..." -ForegroundColor Yellow
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please download and install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "`nChecking npm..." -ForegroundColor Yellow
if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✓ npm found: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "✗ npm is not available!" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✓ Dependencies already installed." -ForegroundColor Green
}

# Create .env file
Write-Host "`nChecking environment configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created!" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: Please edit .env file and configure your database settings!" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file already exists." -ForegroundColor Green
}

# Build the project
Write-Host "`nBuilding TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build completed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed! Check for TypeScript errors above." -ForegroundColor Red
    Read-Host "Press Enter to continue anyway"
}

# Final instructions
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Setup completed!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Configure your database in .env file" -ForegroundColor White
Write-Host "2. Ensure PostgreSQL is running" -ForegroundColor White
Write-Host "3. Run database migrations: npm run db:migrate" -ForegroundColor White
Write-Host "4. Start development server: npm run dev" -ForegroundColor White

Write-Host "`nAccess URLs:" -ForegroundColor Yellow
Write-Host "• Main Application: http://localhost:3000" -ForegroundColor White
Write-Host "• Certificate Builder: http://localhost:3000/templates/builder" -ForegroundColor White
Write-Host "• Login: http://localhost:3000/login" -ForegroundColor White

Write-Host "`nDevelopment Commands:" -ForegroundColor Yellow
Write-Host "• npm run dev       - Start with hot reload" -ForegroundColor White
Write-Host "• npm run build     - Build for production" -ForegroundColor White
Write-Host "• npm start         - Start production server" -ForegroundColor White
Write-Host "• npm run db:migrate - Run database migrations" -ForegroundColor White
Write-Host "• npm run db:seed   - Seed sample data" -ForegroundColor White

$continue = Read-Host "`nWould you like to start the development server now? (y/N)"
if ($continue -eq "y" -or $continue -eq "Y") {
    Write-Host "`nStarting development server..." -ForegroundColor Green
    npm run dev
}