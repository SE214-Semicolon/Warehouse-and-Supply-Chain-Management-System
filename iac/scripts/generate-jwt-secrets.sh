#!/bin/bash
# Generate JWT secrets for local development

echo "🔐 Generating JWT secrets for local development..."
echo ""

ACCESS_SECRET=$(openssl rand -base64 32)
REFRESH_SECRET=$(openssl rand -base64 32)

echo "TF_VAR_jwt_access_secret=\"$ACCESS_SECRET\""
echo "TF_VAR_jwt_refresh_secret=\"$REFRESH_SECRET\""
echo ""
echo "📋 Copy these values to your .env file or export them:"
echo "export TF_VAR_jwt_access_secret=\"$ACCESS_SECRET\""
echo "export TF_VAR_jwt_refresh_secret=\"$REFRESH_SECRET\""
echo ""
echo "⚠️  WARNING: These are development secrets only!"
echo "   Do not use in production. Generate new ones for production."