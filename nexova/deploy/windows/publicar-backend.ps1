# Reinicia la API NEXOVA (PM2) en el servidor
param(
    [string]$BackendPath = "C:\Proyectos\nexova\backend"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path $BackendPath)) {
    Write-Host "ERROR: No existe $BackendPath" -ForegroundColor Red
    exit 1
}

Set-Location $BackendPath
Write-Host ">> Reiniciando nexova-api..."
pm2 restart nexova-api
pm2 save
Write-Host ">> Ultimas lineas del log:"
pm2 logs nexova-api --lines 15 --nostream
