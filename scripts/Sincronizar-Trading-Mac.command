#!/bin/bash
# Navegar al directorio donde está este script
cd "$(dirname "$0")"

# Comprobar si Node.js está disponible
if ! command -v node &> /dev/null; then
    echo "=========================================================="
    echo " ❌ Node.js no está instalado en este equipo."
    echo " Por favor, instálalo gratis desde: https://nodejs.org"
    echo "=========================================================="
    read -p "Presiona Enter para salir..."
    exit 1
fi

node sync-agent.mjs
