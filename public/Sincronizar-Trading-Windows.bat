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

:: 2. Si falta sync-agent.mjs en la carpeta, descargarlo automaticamente de la web
if not exist "%~dp0sync-agent.mjs" (
    echo [*] Descargando motor de sincronizacion...
    curl -s -f -o "%~dp0sync-agent.mjs" "https://state-trading-lake.vercel.app/sync-agent.mjs"
    if not exist "%~dp0sync-agent.mjs" (
        echo [X] No se pudo descargar sync-agent.mjs.
        echo Asegurate de tener conexion a Internet o de colocar sync-agent.mjs junto a este archivo.
        pause
        exit /b 1
    )
    echo [OK] Motor descargado correctamente.
    echo.
)

:: 3. Comprobar si TradingView esta respondiendo en el puerto 9222
curl -s http://127.0.0.1:9222/json/version >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] TradingView no esta abierto con el puerto de sincronizacion.
    echo [*] Abriendo TradingView Desktop automaticamente...
    
    if exist "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" (
        start "" "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" --remote-debugging-port=9222
    ) else if exist "%ProgramFiles%\TradingView\TradingView.exe" (
        start "" "%ProgramFiles%\TradingView\TradingView.exe" --remote-debugging-port=9222
    ) else if exist "%ProgramFiles(x86)%\TradingView\TradingView.exe" (
        start "" "%ProgramFiles(x86)%\TradingView\TradingView.exe" --remote-debugging-port=9222
    ) else (
        start "" "TradingView" --remote-debugging-port=9222 2>nul
    )
    
    echo [*] Esperando 5 segundos a que inicie TradingView...
    timeout /t 5 /nobreak >nul
)

:: 4. Ejecutar sincronizador
node sync-agent.mjs
pause
