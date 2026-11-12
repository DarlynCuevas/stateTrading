@echo off
title Iniciar TradingView para Sincronizacion
echo Iniciando TradingView Desktop...

if exist "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" (
    start "" "%LOCALAPPDATA%\Programs\TradingView\TradingView.exe" --remote-debugging-port=9222
    exit
)

if exist "%PROGRAMFILES%\TradingView\TradingView.exe" (
    start "" "%PROGRAMFILES%\TradingView\TradingView.exe" --remote-debugging-port=9222
    exit
)

if exist "%PROGRAMFILES(X86)%\TradingView\TradingView.exe" (
    start "" "%PROGRAMFILES(X86)%\TradingView\TradingView.exe" --remote-debugging-port=9222
    exit
)

start tradingview: --remote-debugging-port=9222
exit
