#!/bin/bash

# Health check script for deployed applications

ENVIRONMENT=${1:-staging}
BASE_URL=""

if [ "$ENVIRONMENT" = "staging" ]; then
    BASE_URL="https://warehouse-mgmt-staging"
elif [ "$ENVIRONMENT" = "production" ]; then
    BASE_URL="https://warehouse-mgmt-production"
else
    echo "❌ Invalid environment. Use 'staging' or 'production'"
    exit 1
fi

BACKEND_URL="${BASE_URL}-backend.azurewebsites.net"
FRONTEND_URL="${BASE_URL}-frontend.azurewebsites.net"

echo "🔍 Performing health checks for $ENVIRONMENT environment..."
echo ""

# Check backend health
echo "🔧 Checking backend health..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" || echo "000")

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend is healthy (HTTP $BACKEND_STATUS)"
else
    echo "❌ Backend health check failed (HTTP $BACKEND_STATUS)"
fi

# Check frontend health
echo "🌐 Checking frontend health..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/health" || echo "000")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ Frontend is healthy (HTTP $FRONTEND_STATUS)"
else
    echo "❌ Frontend health check failed (HTTP $FRONTEND_STATUS)"
fi

echo ""

# Overall status
if [ "$BACKEND_STATUS" = "200" ] && [ "$FRONTEND_STATUS" = "200" ]; then
    echo "🎉 All services are healthy!"
    echo "🔗 Backend URL: $BACKEND_URL"
    echo "🔗 Frontend URL: $FRONTEND_URL"
    exit 0
else
    echo "⚠️  Some services are not healthy. Please check the logs."
    exit 1
fi