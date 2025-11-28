#!/bin/bash
# Run Terraform locally with .env file loaded

set -e

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Run: cp .env.example .env and edit with your values"
    exit 1
fi

# Load environment variables
echo "📄 Loading environment variables from .env..."
export $(grep -v '^#' .env | xargs)

# Check required variables
REQUIRED_VARS=("TF_VAR_external_postgres_url" "TF_VAR_external_mongodb_url" "TF_VAR_jwt_access_secret" "TF_VAR_jwt_refresh_secret")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required variable $var is not set in .env file"
        exit 1
    fi
done

echo "✅ Environment variables loaded successfully"

# Run terraform with provided arguments
echo "🚀 Running: terraform $@"
terraform "$@"