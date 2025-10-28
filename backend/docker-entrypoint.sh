#!/bin/sh
set -e

echo "========================================"
echo "Starting Backend Application"
echo "========================================"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "========================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL is not set!"
else
  echo "DATABASE_URL is configured"
fi

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client..."
npx prisma generate

echo "Starting application..."
exec node dist/main.js
