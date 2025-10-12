#!/bin/bash

# Generate secure secrets for the application

echo "🔐 Generating secure secrets for Warehouse Management System..."
echo ""

# Generate PostgreSQL password
POSTGRES_PASSWORD_STAGING=$(openssl rand -base64 16 | tr -d "=+/")
POSTGRES_PASSWORD_PRODUCTION=$(openssl rand -base64 24 | tr -d "=+/")

# Generate JWT secrets
JWT_ACCESS_SECRET_STAGING=$(openssl rand -base64 16 | tr -d "=+/")
JWT_REFRESH_SECRET_STAGING=$(openssl rand -base64 16 | tr -d "=+/")
JWT_ACCESS_SECRET_PRODUCTION=$(openssl rand -base64 32 | tr -d "=+/")
JWT_REFRESH_SECRET_PRODUCTION=$(openssl rand -base64 32 | tr -d "=+/")

echo "📋 Generated secrets (save these securely):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "POSTGRES_ADMIN_USERNAME: warehouse_admin"
echo "POSTGRES_ADMIN_PASSWORD_STAGING: $POSTGRES_PASSWORD_STAGING"
echo "POSTGRES_ADMIN_PASSWORD_PRODUCTION: $POSTGRES_PASSWORD_PRODUCTION"
echo ""
echo "JWT_ACCESS_SECRET_STAGING: $JWT_ACCESS_SECRET_STAGING"
echo "JWT_REFRESH_SECRET_STAGING: $JWT_REFRESH_SECRET_STAGING"
echo "JWT_ACCESS_SECRET_PRODUCTION: $JWT_ACCESS_SECRET_PRODUCTION"
echo "JWT_REFRESH_SECRET_PRODUCTION: $JWT_REFRESH_SECRET_PRODUCTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: Store these secrets securely and never commit them to version control!"
echo "🔧 Add these as GitHub Secrets for automated deployment"