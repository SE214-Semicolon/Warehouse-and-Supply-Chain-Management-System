#!/bin/sh
set -e

echo "========================================"
echo "Starting Backend Application"
echo "========================================"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Current directory: $(pwd)"
echo "Environment: $NODE_ENV"
echo "========================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: DATABASE_URL is not set!"
else
  echo "DATABASE_URL is configured"
fi

# Generate Prisma Client (always needed)
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations only if explicitly enabled
# Default to true for production, false for development
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "Skipping migrations (RUN_MIGRATIONS=${RUN_MIGRATIONS})"
fi

echo "Starting application..."
exec node dist/main.js
