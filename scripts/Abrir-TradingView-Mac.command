#!/bin/bash
# Script para iniciar TradingView Desktop en Mac con puerto de sincronización
open -a "TradingView" --args --remote-debugging-port=9222
osascript -e 'tell application "Terminal" to close (every window whose name contains "Abrir-TradingView")' 2>/dev/null || true
