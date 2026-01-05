# Script de limpieza de archivos no utilizados
# Executive Performance CRM - 2025-12-14

$rootPath = "C:\Users\rumadr\Desktop\firebase-web-app"

$filesToDelete = @(
    "public\css\weather-widget.css",
    "public\js\weather-widget.js",
    "public\js\calls-management.js",
    "public\js\calls-tracking.js",
    "public\js\test-orders-system.js",
    "public\js\orders-management.js",
    "public\js\orders-tracking.js",
    "public\js\firebase-bridge.js",
    "public\css\orders-styles.css",
    "public\test-metricas.html",
    "public\migrate.html",
    "public\splash.html",
    "public\delete-my-clients.html",
    "public\metrics-dashboard.html",
    "new-tab-ventas.html"
)

$deletedCount = 0
$notFoundCount = 0

Write-Host "Archivos a eliminar: $($filesToDelete.Count)" -ForegroundColor Yellow
foreach ($file in $filesToDelete) {
    Write-Host "  - $file" -ForegroundColor Gray
}
Write-Host ""

$confirmation = Read-Host "Continuar? (S/N)"
if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "Cancelado" -ForegroundColor Red
    exit
}

Write-Host "`nEliminando archivos...`n" -ForegroundColor Yellow

foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $rootPath $file
    
    if (Test-Path $fullPath) {
        try {
            Remove-Item $fullPath -Force
            Write-Host "OK: $file" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "ERROR: $file" -ForegroundColor Red
        }
    }
    else {
        Write-Host "NO EXISTE: $file" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "RESUMEN:" -ForegroundColor Cyan
Write-Host "  Eliminados: $deletedCount" -ForegroundColor Green
Write-Host "  No encontrados: $notFoundCount" -ForegroundColor Yellow
Write-Host "`nLimpieza completada" -ForegroundColor Green
