# Publica el frontend de NEXOVA en IIS
# Ejecutar en el SERVIDOR: PowerShell como Administrador
param(
    [string]$IisRoot = "C:\inetpub\wwwroot"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$frontend = Join-Path $repoRoot "frontend"
$dist = Join-Path $frontend "dist"

if (-not (Test-Path $IisRoot)) {
    Write-Host ""
    Write-Host "ERROR: No existe la carpeta: $IisRoot" -ForegroundColor Red
    Write-Host "Abre PowerShell como Administrador y vuelve a ejecutar este script."
    Write-Host "O crea el sitio en IIS con ruta fisica $IisRoot"
    exit 1
}

Write-Host ">> Build frontend en $frontend"
Set-Location $frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm run build fallo" -ForegroundColor Red
    exit 1
}

Write-Host ">> Copiando dist a $IisRoot"
xcopy /E /Y "$dist\*" "$IisRoot\"
if ($LASTEXITCODE -gt 1) {
    Write-Host "ERROR: xcopy fallo (codigo $LASTEXITCODE). ¿PowerShell como Administrador?" -ForegroundColor Red
    exit 1
}

$webConfig = Join-Path $PSScriptRoot "web.config"
if (Test-Path $webConfig) {
    Copy-Item $webConfig (Join-Path $IisRoot "web.config") -Force
    Write-Host ">> web.config actualizado"
}

Write-Host ""
Write-Host "OK - Frontend publicado en $IisRoot" -ForegroundColor Green
Write-Host "Recarga el navegador con Ctrl+F5"
Write-Host ""
Write-Host "Verificacion:"
$index = Join-Path $IisRoot "index.html"
if (Test-Path $index) { Write-Host "  index.html presente - OK" -ForegroundColor Green }
else { Write-Host "  AVISO: falta index.html en $IisRoot" -ForegroundColor Yellow }
$assets = Get-ChildItem (Join-Path $IisRoot "assets\*.js") -ErrorAction SilentlyContinue
if ($assets) { Write-Host "  Bundle JS publicado ($($assets.Count) archivos) - OK" -ForegroundColor Green }
else { Write-Host "  AVISO: no hay assets JS en dist" -ForegroundColor Yellow }
$versionFile = Join-Path $IisRoot "version.json"
if (Test-Path $versionFile) {
    $ver = Get-Content $versionFile -Raw | ConvertFrom-Json
    Write-Host "  Version publicada: $($ver.version) - OK" -ForegroundColor Green
    Write-Host "  Comprueba en el navegador: https://crm.novaarctech.com.mx/version.json"
} else {
    Write-Host "  AVISO: falta version.json en $IisRoot (no se copio public/)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Backend (asesores crear/editar): reinicia la API despues de actualizar codigo:"
Write-Host "  cd $repoRoot\backend"
Write-Host "  pm2 restart nexova-api"
