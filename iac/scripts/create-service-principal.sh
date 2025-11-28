#!/bin/bash
# Script to create Azure Service Principal for GitHub Actions

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Creating Azure Service Principal for GitHub Actions...${NC}"

# Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${YELLOW}Subscription ID: ${SUBSCRIPTION_ID}${NC}"

# Create Service Principal
echo -e "${YELLOW}Creating Service Principal...${NC}"
SP_OUTPUT=$(az ad sp create-for-rbac \
  --name "github-actions-warehouse-system" \
  --role contributor \
  --scopes /subscriptions/${SUBSCRIPTION_ID} \
  --sdk-auth)

echo -e "${GREEN}Service Principal created!${NC}"
echo ""
echo -e "${YELLOW}================================${NC}"
echo -e "${GREEN}GitHub Secrets to add:${NC}"
echo -e "${YELLOW}================================${NC}"
echo ""

# Parse the output
CLIENT_ID=$(echo $SP_OUTPUT | jq -r '.clientId')
CLIENT_SECRET=$(echo $SP_OUTPUT | jq -r '.clientSecret')
TENANT_ID=$(echo $SP_OUTPUT | jq -r '.tenantId')

echo -e "${GREEN}AZURE_CREDENTIALS${NC} (for azure/login action):"
echo "$SP_OUTPUT"
echo ""
echo -e "${GREEN}AZURE_CLIENT_ID:${NC}"
echo "$CLIENT_ID"
echo ""
echo -e "${GREEN}AZURE_CLIENT_SECRET:${NC}"
echo "$CLIENT_SECRET"
echo ""
echo -e "${GREEN}AZURE_TENANT_ID:${NC}"
echo "$TENANT_ID"
echo ""
echo -e "${GREEN}AZURE_SUBSCRIPTION_ID:${NC}"
echo "$SUBSCRIPTION_ID"
echo ""
echo -e "${YELLOW}================================${NC}"
echo -e "${RED}⚠️  IMPORTANT: Save these values securely!${NC}"
echo -e "${RED}⚠️  Add them as secrets in GitHub repo settings${NC}"
echo -e "${YELLOW}================================${NC}"
