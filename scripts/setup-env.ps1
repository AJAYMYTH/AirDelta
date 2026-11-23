<#
.SYNOPSIS
  AirDelta Interactive Environment Configuration Script
.DESCRIPTION
  Sets up .env file with Google Gemini, Supabase Postgres, and Telegram Bot keys safely.
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AirDelta Configuration Wizard          " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env"
$exampleFile = ".env.example"

if (-not (Test-Path $envFile)) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item $exampleFile $envFile
}

function Set-EnvVariable([string]$key, [string]$value) {
    if ([string]::IsNullOrWhiteSpace($value)) { return }
    $content = Get-Content $envFile -Raw
    $pattern = "(?m)^$key=.*$"
    if ($content -match $pattern) {
        $content = $content -replace $pattern, "$key=$value"
    } else {
        $content += "`n$key=$value"
    }
    Set-Content -Path $envFile -Value $content -NoNewline
    Write-Host "  [OK] Saved $key" -ForegroundColor Green
}

# 1. Google AI Studio (Gemini)
Write-Host "`n--- 1. Google Gemini API ---" -ForegroundColor Cyan
Write-Host "Get your free API key at: https://aistudio.google.com/" -ForegroundColor Gray
$gemini = Read-Host "Enter GEMINI_API_KEY (press Enter to skip)"
if ($gemini) { Set-EnvVariable "GEMINI_API_KEY" $gemini.Trim() }

# 2. Google Maps Air Quality API (Optional)
Write-Host "`n--- 2. Google Maps Air Quality API (Optional) ---" -ForegroundColor Cyan
Write-Host "Enable in GCP Console at: https://console.cloud.google.com/apis/library/airquality.googleapis.com" -ForegroundColor Gray
$gmaps = Read-Host "Enter GOOGLE_MAPS_API_KEY (press Enter to skip)"
if ($gmaps) { Set-EnvVariable "GOOGLE_MAPS_API_KEY" $gmaps.Trim() }

# 3. Supabase Postgres
Write-Host "`n--- 3. Supabase Postgres & Auth ---" -ForegroundColor Cyan
Write-Host "Create a free project at: https://supabase.com/" -ForegroundColor Gray
Write-Host "Go to Project Settings -> API to copy your URL and Keys." -ForegroundColor Gray
$supaUrl = Read-Host "Enter SUPABASE_URL (e.g. https://xyz.supabase.co, press Enter to skip)"
if ($supaUrl) { Set-EnvVariable "SUPABASE_URL" $supaUrl.Trim() }

$supaAnon = Read-Host "Enter SUPABASE_ANON_KEY (press Enter to skip)"
if ($supaAnon) { Set-EnvVariable "SUPABASE_ANON_KEY" $supaAnon.Trim() }

$supaService = Read-Host "Enter SUPABASE_SERVICE_ROLE_KEY (press Enter to skip)"
if ($supaService) { Set-EnvVariable "SUPABASE_SERVICE_ROLE_KEY" $supaService.Trim() }

# 4. Telegram Bot
Write-Host "`n--- 4. Telegram Bot API (Option B) ---" -ForegroundColor Cyan
Write-Host "Create a bot by sending /newbot to @BotFather in Telegram: https://t.me/BotFather" -ForegroundColor Gray
$tgToken = Read-Host "Enter TELEGRAM_BOT_TOKEN (press Enter to skip)"
if ($tgToken) { Set-EnvVariable "TELEGRAM_BOT_TOKEN" $tgToken.Trim() }

Write-Host "`nTesting configuration with verifier..." -ForegroundColor Cyan
node ./scripts/verify-env.mjs
