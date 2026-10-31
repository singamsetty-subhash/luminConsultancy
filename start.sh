#!/usr/bin/env bash
# ===================================================================
# Lumin Consultancy Web Portal & Admin Dashboard - Startup Script
# ===================================================================

echo "==================================================================="
echo "  Lumin Consultancy Web Portal & Admin Dashboard"
echo "==================================================================="
echo ""

if ! command -v php &> /dev/null; then
    echo "[ERROR] PHP is not installed or not in your PATH."
    echo "Please install PHP (version 8.0+) to start the development server."
    exit 1
fi

PORT="${PORT:-8080}"
echo "[OK] Starting PHP built-in web server on http://localhost:${PORT} ..."
echo "Press Ctrl+C to stop the server."
echo ""

# Attempt to open browser across platforms
if which xdg-open > /dev/null; then
    (sleep 1.5 && xdg-open "http://localhost:${PORT}/") &
elif which open > /dev/null; then
    (sleep 1.5 && open "http://localhost:${PORT}/") &
fi

php -S "0.0.0.0:${PORT}" router.php
