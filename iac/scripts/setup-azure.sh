#!/bin/bash
# Azure Deployment Setup Script
# This script creates the necessary Azure resources for Terraform deployment

set -e

# Configuration
SUBSCRIPTION_ID="45c689f9-48ac-4c1f-94ba-1f700ecd5bb7"
RESOURCE_GROUP_NAME="terraform-state-rg"
STORAGE_ACCOUNT_NAME="warehouse$(date +%s)"
CONTAINER_NAME="tfstate"
LOCATION="Southeast Asia"
SERVICE_PRINCIPAL_NAME="warehouse"

echo "🚀 Setting up Azure infrastructure for Terraform deployment..."

# Login to Azure
echo "📝 Logging in to Azure..."
az login

# Set subscription
echo "🎯 Setting subscription to $SUBSCRIPTION_ID..."
az account set --subscription "$SUBSCRIPTION_ID"

# Create resource group for Terraform state
echo "🏗️ Creating resource group: $RESOURCE_GROUP_NAME..."
az group create \
   --name "$RESOURCE_GROUP_NAME" \
   --location "$LOCATION" > /dev/null

# Create storage account for Terraform state
echo "💾 Creating storage account: $STORAGE_ACCOUNT_NAME..."
az storage account create \
   --resource-group "$RESOURCE_GROUP_NAME" \
   --name "$STORAGE_ACCOUNT_NAME" \
   --sku "Standard_LRS" \
   --encryption-services blob \
   --location "$LOCATION" > /dev/null

# Get storage account key
STORAGE_KEY=$(az storage account keys list \
   --resource-group "$RESOURCE_GROUP_NAME" \
   --account-name "$STORAGE_ACCOUNT_NAME" \
   --query '[0].value' -o tsv)

# Create container for Terraform state
echo "📦 Creating storage container: $CONTAINER_NAME..."
az storage container create \
   --name "$CONTAINER_NAME" \
   --account-name "$STORAGE_ACCOUNT_NAME" \
   --account-key "$STORAGE_KEY" > /dev/null

# Create service principal
echo "🔐 Creating service principal: $SERVICE_PRINCIPAL_NAME..."
SP_OUTPUT=$(az ad sp create-for-rbac \
   --name "$SERVICE_PRINCIPAL_NAME" \
   --role "Contributor" \
   --scopes "/subscriptions/$SUBSCRIPTION_ID" \
   --sdk-auth)

# Extract service principal details
CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
CLIENT_SECRET=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')
TENANT_ID=$(echo "$SP_OUTPUT" | jq -r '.tenantId')

# --- OUTPUT FOR GITHUB ACTIONS ---
echo "⬇️ FOR GITHUB ACTIONS ⬇️"
echo "📋 Copy the ENTIRE JSON block below and save it as a GitHub Repository Secret:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Secret Name:  AZURE_CREDENTIALS"
echo "Secret Value:"
echo "$SP_OUTPUT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# --- OUTPUT FOR LOCAL DEVELOPMENT ---
# Extract individual values from the JSON for local use
CLIENT_ID=$(echo "$SP_OUTPUT" | jq -r '.clientId')
CLIENT_SECRET=$(echo "$SP_OUTPUT" | jq -r '.clientSecret')
TENANT_ID=$(echo "$SP_OUTPUT" | jq -r '.tenantId')

echo "⬇️ FOR LOCAL DEVELOPMENT ⬇️"
echo "📋 To run 'terraform plan' locally, copy and paste these commands into your terminal:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "export ARM_SUBSCRIPTION_ID=\"$SUBSCRIPTION_ID\""
echo "export ARM_CLIENT_ID=\"$CLIENT_ID\""
echo "export ARM_CLIENT_SECRET=\"$CLIENT_SECRET\""
echo "export ARM_TENANT_ID=\"$TENANT_ID\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""