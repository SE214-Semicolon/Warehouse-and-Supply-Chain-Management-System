#!/bin/bash
# Local Terraform Setup Script
# This script helps developers set up their local environment for Terraform development

set -e

echo "🚀 Setting up local Terraform environment..."

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first:"
    echo "   https://www.terraform.io/downloads"
    exit 1
fi

# Login to Azure
echo "🔐 Logging into Azure..."
az login --use-device-code

# Set subscription (you may need to change this)
echo "📋 Setting Azure subscription..."
# az account set --subscription "your-subscription-id"

echo "✅ Local setup complete!"
echo ""
echo "📝 To run Terraform locally:"
echo ""
echo "1. Copy and edit environment variables:"
echo "   cp .env.example .env"
echo "   # Edit .env with your actual database URLs"
echo "   # JWT secrets are pre-generated, or generate new ones:"
echo "   ./scripts/generate-jwt-secrets.sh"
echo ""
echo "2. Navigate to environment directory:"
echo "   cd environments/staging"
echo ""
echo "3. Initialize Terraform:"
echo "   terraform init"
echo ""
echo "4. Plan changes:"
echo "   terraform plan"
echo ""
echo "5. Apply changes:"
echo "   terraform apply"
echo ""
echo "⚠️  WARNING: terraform apply will create real Azure resources!"
echo "   Use terraform destroy to clean up when done testing."