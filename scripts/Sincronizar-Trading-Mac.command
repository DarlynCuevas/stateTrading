#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "       StateTrading · Sincronizador de Escritorio       "
echo "========================================================"
echo ""

# 1. Comprobar Node.js
if ! command -v node &> /dev/null; then
    echo "=========================================================="
    echo " ❌ Node.js no está instalado en este equipo."
    echo " Descárgalo e instálalo gratis desde: https://nodejs.org"
    echo "=========================================================="
    read -p "Presiona Enter para salir..."
    exit 1
fi

# 2. Si falta sync-agent.mjs en la carpeta, descargarlo
if [ ! -f "sync-agent.mjs" ]; then
    echo "Descargando motor de sincronización..."
    curl -s -f -o "sync-agent.mjs" "https://state-trading-lake.vercel.app/sync-agent.mjs"
fi

# 3. Comprobar si TradingView está abierto en puerto 9222
if ! curl -s http://127.0.0.1:9222/json/version &> /dev/null; then
    echo "Iniciando TradingView Desktop en modo sincronización..."
    open -a "TradingView" --args --remote-debugging-port=9222 2>/dev/null
    sleep 3
fi

# 4. Ejecutar la sincronización
node sync-agent.mjs
