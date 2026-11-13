@echo off
title StateTrading - Sincronizador de Operaciones
cd /d "%~dp0"

echo ========================================================
echo        StateTrading - Sincronizador de Escritorio
echo ========================================================
echo.

:: 1. Comprobar Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js no esta instalado en este equipo.
    echo Descargalo e instalalo gratis en 1 minuto desde:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Actualizar o descargar sync-agent.mjs desde la web
curl -s -f -o "%~dp0sync-agent.mjs.new" "https://state-trading-lake.vercel.app/sync-agent.mjs"
if exist "%~dp0sync-agent.mjs.new" (
    move /y "%~dp0sync-agent.mjs.new" "%~dp0sync-agent.mjs" >nul
)
if not exist "%~dp0sync-agent.mjs" (
    echo [X] No se pudo descargar sync-agent.mjs.
    echo Asegurate de tener conexion a Internet o de colocar sync-agent.mjs junto a este archivo.
    pause
    exit /b 1
)

:: 3. Comprobar si TradingView esta respondiendo en el puerto 9222
curl -s http://127.0.0.1:9222/json/version >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] TradingView no tiene el puerto de conexion activo.
    echo [*] Reiniciando TradingView con el puerto 9222 a traves de PowerShell...

    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process TradingView -ErrorAction SilentlyContinue | Stop-Process -Force"
    timeout /t 2 /nobreak >nul

    powershell -NoProfile -ExecutionPolicy Bypass -Command "$paths = @(\"$env:LOCALAPPDATA\Microsoft\WindowsApps\TradingView.exe\", \"$env:USERPROFILE\OneDrive\Escritorio\TradingView.lnk\", \"$env:USERPROFILE\OneDrive\Desktop\TradingView.lnk\", \"$env:USERPROFILE\Desktop\TradingView.lnk\", \"$env:LOCALAPPDATA\Programs\TradingView\TradingView.exe\", \"$env:ProgramFiles\TradingView\TradingView.exe\"); $started = $false; foreach ($p in $paths) { if (Test-Path $p) { Write-Host \"[*] Abriendo TradingView desde: $p\"; Start-Process $p -ArgumentList '--remote-debugging-port=9222'; $started = $true; break; } }; if (-not $started) { Write-Host '[*] Abriendo comando TradingView...'; Start-Process 'TradingView' -ArgumentList '--remote-debugging-port=9222'; }"

    echo [*] Esperando 6 segundos a que TradingView cargue...
    timeout /t 6 /nobreak >nul
)

:: 4. Ejecutar sincronizador
node sync-agent.mjs
pause
