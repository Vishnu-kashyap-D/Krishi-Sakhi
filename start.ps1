# Start Krishi Sakhi (backend on 3001, frontend on 3000)
$root = $PSScriptRoot
$backend = Join-Path $root 'krishi-sakhi-backend'
$frontend = Join-Path $root 'krishi-sakhi-frontend'

Write-Host "Starting Krishi Sakhi..." -ForegroundColor Green

# First run: create the backend .env from the example so the server can start.
$envFile = Join-Path $backend '.env'
if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $backend '.env.example') $envFile
    Write-Host "Created krishi-sakhi-backend\.env from .env.example." -ForegroundColor Yellow
    Write-Host "Set GEMINI_API_KEY (AI features) and JWT_SECRET in that file." -ForegroundColor Yellow
}

# Install dependencies if they are missing.
foreach ($dir in @($backend, $frontend)) {
    if (-not (Test-Path (Join-Path $dir 'node_modules'))) {
        Write-Host "Installing dependencies in $dir ..." -ForegroundColor Yellow
        Push-Location $dir
        npm install
        Pop-Location
    }
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; npm start" -WindowStyle Normal
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Backend API: http://localhost:3001  (health: /api/health)" -ForegroundColor White
Write-Host "Frontend UI: http://localhost:3000" -ForegroundColor White
Write-Host "Close both PowerShell windows to stop." -ForegroundColor Gray
