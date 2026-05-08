#!/bin/sh
set -e

echo "→ Aplicando schema no banco (prisma db push)..."
node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 || echo "⚠ db push falhou — continuando mesmo assim"

echo "→ Iniciando servidor Next.js..."
exec node server.js
