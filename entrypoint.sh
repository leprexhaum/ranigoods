#!/bin/sh
set -e

echo "→ Aplicando schema no banco (prisma db push)..."
if [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_URI" ] || [ -n "$POSTGRES_CONNECTION_STRING" ]; then
  npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "⚠ db push falhou — continuando mesmo assim"
else
  echo "⚠ DATABASE_URL não configurada — pulando db push"
fi

echo "→ Iniciando servidor Next.js..."
exec node server.js
