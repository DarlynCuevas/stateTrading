@echo off
title Iniciar TradingView para StateTrading
cd /d "%~dp0"

echo ========================================================
echo        Iniciar TradingView (Puerto de Sincronizacion)
echo ========================================================
echo.
echo [*] Cerrando instancias previas de TradingView...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process TradingView -ErrorAction SilentlyContinue | Stop-Process -Force"
timeout /t 2 /nobreak >nul

echo [*] Iniciando TradingView con puerto 9222...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$paths = @(\"$env:LOCALAPPDATA\Microsoft\WindowsApps\TradingView.exe\", \"$env:USERPROFILE\OneDrive\Escritorio\TradingView.lnk\", \"$env:USERPROFILE\OneDrive\Desktop\TradingView.lnk\", \"$env:USERPROFILE\Desktop\TradingView.lnk\", \"$env:LOCALAPPDATA\Programs\TradingView\TradingView.exe\", \"$env:ProgramFiles\TradingView\TradingView.exe\"); $started = $false; foreach ($p in $paths) { if (Test-Path $p) { Write-Host \"[*] Iniciando desde: $p\"; Start-Process $p -ArgumentList '--remote-debugging-port=9222'; $started = $true; break; } }; if (-not $started) { Start-Process 'TradingView' -ArgumentList '--remote-debugging-port=9222'; }"

echo [*] Comprobando conexion...
timeout /t 5 /nobreak >nul
curl -s http://127.0.0.1:9222/json/version >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] TradingView conectado y listo para sincronizar!
) else (
    echo [*] Espera unos segundos a que cargue TradingView y luego ejecuta la sincronizacion.
)
echo.
pause
