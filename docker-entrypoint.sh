#!/bin/sh
set -e

# Dynamically set port (defaults to 8080 if PORT is not set by cloud provider)
PORT="${PORT:-8080}"
echo "[Lumin Site] Starting Apache on port ${PORT}..."

# Update Apache configuration with dynamic PORT
sed -i "s/Listen [0-9]*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:[0-9]*>/<VirtualHost \*:${PORT}>/" /etc/apache2/sites-available/000-default.conf

exec "$@"

