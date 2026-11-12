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
    echo [*] TradingView no tiene el puerto de conexion activo.

    :: Si TradingView ya estaba abierto normalmente (sin puerto), debemos cerrarlo primero
    tasklist /FI "IMAGENAME eq TradingView.exe" 2>nul | find /I /N "TradingView.exe">nul
    if %errorlevel% equ 0 (
        echo [*] TradingView estaba abierto sin el puerto de sincronizacion.
        echo [*] Reiniciando TradingView con el puerto 9222...
        taskkill /F /IM TradingView.exe >nul 2>nul
        timeout /t 2 /nobreak >nul
    ) else (
        echo [*] Abriendo TradingView Desktop con puerto de sincronizacion...
    )
    
    set "TV_PATH="
    if exist "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" set "TV_PATH=%LOCALAPPDATA%\Programs\TradingView\TradingView.exe"
    if not defined TV_PATH if exist "%LOCALAPPDATA%\Programs\TradingView Desktop\TradingView.exe" set "TV_PATH=%LOCALAPPDATA%\Programs\TradingView Desktop\TradingView.exe"
    if not defined TV_PATH if exist "%ProgramFiles%\TradingView\TradingView.exe" set "TV_PATH=%ProgramFiles%\TradingView\TradingView.exe"
    if not defined TV_PATH if exist "%ProgramFiles(x86)%\TradingView\TradingView.exe" set "TV_PATH=%ProgramFiles(x86)%\TradingView\TradingView.exe"
    if not defined TV_PATH if exist "%LOCALAPPDATA%\Microsoft\WindowsApps\TradingView.exe" set "TV_PATH=%LOCALAPPDATA%\Microsoft\WindowsApps\TradingView.exe"

    if defined TV_PATH (
        start "" "%TV_PATH%" --remote-debugging-port=9222
    ) else (
        start "" "TradingView" --remote-debugging-port=9222 2>nul
    )
    
    echo [*] Esperando 6 segundos a que TradingView cargue su interfaz...
    timeout /t 6 /nobreak >nul
)

:: 4. Ejecutar sincronizador
node sync-agent.mjs
pause
