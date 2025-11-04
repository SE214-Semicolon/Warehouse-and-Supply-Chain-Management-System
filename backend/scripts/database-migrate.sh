#!/bin/sh

set -e

echo "Running database migrations..."

# Get environment
NODE_ENV=${NODE_ENV:-development}

# Generate Prisma Client
echo "Generating Prisma client..."
npx prisma generate

if [ "$NODE_ENV" = "production" ]; then
  echo "Running production migrations..."
  npx prisma migrate deploy
else
  echo "Running development migrations..."
  npx prisma migrate dev
fi

echo "Migrations completed successfully"