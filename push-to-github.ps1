# GitHub Push Script for Certificate Generator
param(
    [string]$RemoteUrl = "",
    [string]$CommitMessage = "feat: Enhanced certificate builder with HTMX integration"
)

Write-Host "Certificate Generator - GitHub Push Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to check if Git is available
function Test-GitAvailable {
    try {
        $null = git --version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to find Git executable
function Find-GitExecutable {
    $commonPaths = @(
        "C:\Program Files\Git\bin\git.exe",
        "C:\Program Files (x86)\Git\bin\git.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Git\bin\git.exe",
        "git"  # In PATH
    )
    
    foreach ($path in $commonPaths) {
        try {
            if ($path -eq "git") {
                $null = & $path --version 2>$null
                return $path
            } else {
                if (Test-Path $path) {
                    $null = & $path --version 2>$null
                    return $path
                }
            }
        }
        catch {
            continue
        }
    }
    return $null
}

# Check if Git is available
Write-Host "`nChecking Git availability..." -ForegroundColor Yellow

$gitPath = Find-GitExecutable
if ($gitPath) {
    Write-Host "✓ Git found at: $gitPath" -ForegroundColor Green
    
    # Set alias for easier use
    Set-Alias -Name git -Value $gitPath -Scope Script
} else {
    Write-Host "✗ Git not found!" -ForegroundColor Red
    Write-Host "`nPlease install Git:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://git-scm.com/download/windows" -ForegroundColor White
    Write-Host "2. Or install via winget: winget install Git.Git" -ForegroundColor White
    Write-Host "3. Restart PowerShell after installation" -ForegroundColor White
    Read-Host "`nPress Enter to exit"
    exit 1
}

# Check if this is a Git repository
Write-Host "`nChecking repository status..." -ForegroundColor Yellow
if (!(Test-Path ".git")) {
    Write-Host "✗ Not a Git repository!" -ForegroundColor Red
    $init = Read-Host "Initialize Git repository? (y/N)"
    if ($init -eq "y" -or $init -eq "Y") {
        git init
        Write-Host "✓ Git repository initialized" -ForegroundColor Green
    } else {
        exit 1
    }
} else {
    Write-Host "✓ Git repository found" -ForegroundColor Green
}

# Show current status
Write-Host "`nCurrent Git status:" -ForegroundColor Yellow
git status --short

# Check for changes
$changes = git status --porcelain
if ([string]::IsNullOrEmpty($changes)) {
    Write-Host "✓ No changes to commit" -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit 0
}

# Add all files
Write-Host "`nStaging all changes..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ All changes staged" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to stage changes" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Get commit message
if ([string]::IsNullOrEmpty($CommitMessage)) {
    $CommitMessage = Read-Host "`nEnter commit message"
    if ([string]::IsNullOrEmpty($CommitMessage)) {
        $CommitMessage = "Update: Enhanced certificate builder implementation"
    }
}

# Commit changes
Write-Host "`nCommitting changes..." -ForegroundColor Yellow
git commit -m $CommitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to commit changes" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check remote
$remotes = git remote -v
if ([string]::IsNullOrEmpty($remotes)) {
    if ([string]::IsNullOrEmpty($RemoteUrl)) {
        Write-Host "`nNo remote repository configured." -ForegroundColor Yellow
        $RemoteUrl = Read-Host "Enter GitHub repository URL (https://github.com/username/repo.git)"
    }
    
    if (![string]::IsNullOrEmpty($RemoteUrl)) {
        Write-Host "Adding remote origin..." -ForegroundColor Yellow
        git remote add origin $RemoteUrl
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Remote origin added" -ForegroundColor Green
        } else {
            Write-Host "✗ Failed to add remote origin" -ForegroundColor Red
            Read-Host "Press Enter to exit"
            exit 1
        }
    }
} else {
    Write-Host "`nCurrent remotes:" -ForegroundColor Yellow
    git remote -v
}

# Push to GitHub
Write-Host "`nPushing to GitHub..." -ForegroundColor Yellow
$branch = git branch --show-current
git push -u origin $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "`nYour enhanced certificate builder is now on GitHub!" -ForegroundColor Cyan
} else {
    Write-Host "✗ Failed to push to GitHub" -ForegroundColor Red
    Write-Host "`nThis might be due to:" -ForegroundColor Yellow
    Write-Host "• Authentication issues (use GitHub Desktop or configure SSH)" -ForegroundColor White
    Write-Host "• Repository permissions" -ForegroundColor White
    Write-Host "• Network connectivity" -ForegroundColor White
}

Read-Host "`nPress Enter to exit"