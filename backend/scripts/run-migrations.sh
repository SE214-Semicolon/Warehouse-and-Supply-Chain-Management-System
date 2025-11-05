#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}')
fi

# Functions
check_connection() {
  echo "Checking database connection..."
  if npx prisma db push --skip-generate --preview-feature; then
    echo "Database connection successful"
    return 0
  else
    echo "Database connection failed"
    return 1
  fi
}

run_migrations() {
  if [ "$NODE_ENV" = "production" ]; then
    echo "Running production migrations..."
    npx prisma migrate deploy
  else
    echo "Running development migrations..."
    npx prisma migrate dev
  fi
}

# Main script
echo "========================================"
echo "Database Migration Helper"
echo "Environment: ${NODE_ENV:-development}"
echo "========================================"

# Check database connection first
if check_connection; then
  # Run migrations
  run_migrations
else
  echo "Error: Database connection check failed"
  exit 1
fi