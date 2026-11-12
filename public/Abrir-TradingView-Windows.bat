@echo off
title Iniciar TradingView para StateTrading
taskkill /F /IM TradingView.exe >nul 2>nul
timeout /t 1 /nobreak >nul

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
exit
