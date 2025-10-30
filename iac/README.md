# Infrastructure as Code

Deploy Warehouse Management System to Azure with Terraform.

## Prerequisites

- Azure CLI
- Terraform >= 1.5
- OpenSSL (for generating secrets)

## Local Development Setup

### Option 1: Quick Setup (Recommended)

```bash
# 1. Run automated setup script
cd iac
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh

# 2. Follow the prompts to login to Azure
# Script will check prerequisites and guide you
```

### Option 2: Manual Setup

#### Step 1: Azure Login

```bash
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

#### Step 2: Generate JWT Secrets

```bash
cd iac
chmod +x scripts/generate-jwt-secrets.sh
./scripts/generate-jwt-secrets.sh
```

Copy the output to your `.env` file.

#### Step 3: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file with your values:

```bash
# Database URLs (get from Neon and MongoDB Atlas)
TF_VAR_external_postgres_url="postgresql://user:pass@host:5432/db"
TF_VAR_external_mongodb_url="mongodb+srv://user:pass@host/db"

# JWT Secrets (from generate-jwt-secrets.sh)
TF_VAR_jwt_access_secret="your-generated-secret"
TF_VAR_jwt_refresh_secret="your-generated-secret"

# Application Config
TF_VAR_cors_origin="http://localhost:5173"
TF_VAR_alert_email_addresses='["your-email@example.com"]'
```

#### Step 4: Deploy with Helper Script

```bash
cd environments/staging

# Make script executable
chmod +x ../../scripts/terraform-local.sh

# Initialize (loads .env automatically)
../../scripts/terraform-local.sh init

# Plan (preview changes)
../../scripts/terraform-local.sh plan

# Apply (create resources - WARNING: creates real Azure resources!)
../../scripts/terraform-local.sh apply

# Destroy (cleanup when done)
../../scripts/terraform-local.sh destroy
```

**Note:** The `terraform-local.sh` script automatically:
- Loads variables from `.env` file
- Validates required variables are set
- Runs terraform with proper configuration

### Alternative: Run Terraform Directly

If you prefer not to use the helper script:

```bash
# Load environment variables
source .env

# Run terraform
cd environments/staging
terraform init
terraform plan
terraform apply
```

## Setup External Databases

### Neon PostgreSQL (Free Tier)

1. Sign up at https://neon.tech
2. Create new project
3. Copy connection string
4. Add to `.env` as `TF_VAR_external_postgres_url`

### MongoDB Atlas (Free Tier)

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create M0 Free cluster
3. Create database user
4. Whitelist IP: 0.0.0.0/0
5. Copy connection string
6. Add to `.env` as `TF_VAR_external_mongodb_url`

## GitHub Actions Setup

### Step 1: Setup Azure Backend

If this is first time setup, create storage account for Terraform state:

```bash
cd iac
chmod +x scripts/setup-azure.sh
./scripts/setup-azure.sh
```

This script will:
- Create resource group for Terraform state
- Create storage account
- Create storage container
- Create Service Principal
- Output credentials for GitHub Actions

**Save all the output!**

### Step 2: Create Service Principal (Alternative)

If you only need Service Principal (backend already exists):

```bash
cd iac/scripts
chmod +x create-service-principal.sh
./create-service-principal.sh
```

### Step 3: Add GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these **16 secrets**:

**Azure Authentication (5 secrets):**
- `AZURE_CREDENTIALS` - Full JSON from setup script
- `AZURE_CLIENT_ID` - Client ID
- `AZURE_CLIENT_SECRET` - Client Secret
- `AZURE_TENANT_ID` - Tenant ID
- `AZURE_SUBSCRIPTION_ID` - Subscription ID

**Staging Environment (5 secrets):**
- `EXTERNAL_POSTGRES_URL` - Neon PostgreSQL URL
- `EXTERNAL_MONGODB_URL` - MongoDB Atlas URL
- `JWT_ACCESS_SECRET_STAGING` - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET_STAGING` - Generate: `openssl rand -base64 32`
- `CORS_ORIGIN_STAGING` - Frontend URL

**Production Environment (5 secrets):**
- `EXTERNAL_POSTGRES_URL_PROD` - Neon PostgreSQL URL (production)
- `EXTERNAL_MONGODB_URL_PROD` - MongoDB Atlas URL (production)
- `JWT_ACCESS_SECRET_PRODUCTION` - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET_PRODUCTION` - Generate: `openssl rand -base64 32`
- `CORS_ORIGIN_PRODUCTION` - Frontend URL (production)

**Monitoring (1 secret):**
- `ALERT_EMAIL_1` - Email for alerts

### Step 4: Auto Deploy

**Staging:**
```bash
git push origin develop
```

**Production:**
```bash
git push origin main
```

## Available Scripts

| Script | Purpose |
|--------|---------|
| `setup-local.sh` | One-command local setup |
| `setup-azure.sh` | Create Azure backend + Service Principal |
| `terraform-local.sh` | Run Terraform with .env loaded |
| `generate-jwt-secrets.sh` | Generate JWT secrets |
| `create-service-principal.sh` | Create Service Principal only |

## Architecture

```
Frontend (React)  → Azure App Service B1
Backend (NestJS)  → Azure App Service B1
PostgreSQL        → Neon (External - Free)
MongoDB           → MongoDB Atlas (External - Free)
Monitoring        → Application Insights
Network           → Azure VNet + Subnets
```

**Cost:** $35/month per environment (only App Services, databases free)

## Troubleshooting

### Error: "Azure CLI not found"

Install Azure CLI:

```bash
# Ubuntu/WSL
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS
brew install azure-cli
```

### Error: "Terraform not found"

Download from https://www.terraform.io/downloads

### Error: "Required variable not set"

```bash
# Check .env file
grep TF_VAR_ .env

# Verify all required variables are present
```

### Error: "Backend access denied"

Check if storage account exists:

```bash
az storage account show \
  --name warehouse1760289755 \
  --resource-group terraform-state-rg
```

If not exists, run `./scripts/setup-azure.sh` to create it.

### Error: "Service Principal authentication failed"

```bash
# Check ARM_* variables are set
env | grep ARM_

# Or run with terraform-local.sh which loads .env automatically
../../scripts/terraform-local.sh plan
```

## Project Structure

```
iac/
├── .env                    # Local environment variables (gitignored)
├── .env.example           # Template
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── providers.tf
│   │   └── backend.tf
│   └── production/
│       └── (same files)
├── modules/
│   ├── app-service/       # App Service module
│   ├── monitoring/        # Application Insights
│   └── networking/        # VNet + Subnets
└── scripts/
    ├── setup-local.sh           # Quick local setup
    ├── setup-azure.sh           # Azure backend setup
    ├── terraform-local.sh       # Run Terraform with .env
    ├── generate-jwt-secrets.sh  # Generate JWT secrets
    └── create-service-principal.sh  # Create SP
```

## Quick Reference

### Generate JWT Secret
```bash
openssl rand -base64 32
```

### Check Azure Subscription
```bash
az account show
```

### List Azure Resources
```bash
az resource list --resource-group rg-warehouse-mgmt-staging --output table
```

### Stop App Services (save money)
```bash
az webapp stop --name <app-name> --resource-group <rg-name>
```

### Start App Services
```bash
az webapp start --name <app-name> --resource-group <rg-name>
```

## Resources

- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)
- [Neon PostgreSQL](https://neon.tech/docs)
- [MongoDB Atlas](https://docs.atlas.mongodb.com/)
