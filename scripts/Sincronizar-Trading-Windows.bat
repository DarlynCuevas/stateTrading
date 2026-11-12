@echo off
title StateTrading - Sincronizador de Operaciones
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ==========================================================
    echo  [X] Node.js no esta instalado en este equipo.
    echo  Descargalo e instalalo gratis en 1 minuto desde:
    echo  https://nodejs.org
    echo ==========================================================
    pause
    exit /b 1
)

node sync-agent.mjs
pause
