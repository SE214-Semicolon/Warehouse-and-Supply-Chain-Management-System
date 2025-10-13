# 🚀 Warehouse Management System - Azure Deployment Guide

## 📋 Tổng quan

Deploy ứng dụng Warehouse Management System lên Microsoft Azure với:
- ✅ Frontend: React + Vite  
- ✅ Backend: NestJS + TypeScript
- ✅ Database: **External** (Neon PostgreSQL + MongoDB Atlas - FREE)
- ✅ Infrastructure: Azure App Services
- ✅ **Chi phí chỉ $70/tháng** cho cả 2 environments (tiết kiệm $60/tháng)

## 💰 Chi phí tối ưu

### Hybrid Database Strategy (Khuyến nghị):
```
Staging Environment:    $35/month (App Service B1 + External DBs)
Production Environment: $70/month (App Service B1 + Azure DBs)
External Databases:     $0/month (Neon + MongoDB Atlas Free Tier)
Azure Databases:        $35/month (PostgreSQL B1ms + Cosmos DB 400RU)
──────────────────────────────────────────────────────
Total: $105/month (Balanced cost vs professional demo)
```

### 3-Month Budget Plan:
```
Tháng 1: $35 (chỉ staging với external DBs)
Tháng 2: $105 (staging + production với Azure DBs)  
Tháng 3: $70 (chỉ production cho demo)
──────────────────────────────────
Total: $210 < $300 budget ✅
```

---

## 🏗️ Architecture

### Application Stack:
```
Frontend (React) → Azure App Service
Backend (NestJS) → Azure App Service  

Staging Environment:
├── PostgreSQL → Neon Database (External, Free)
└── MongoDB → MongoDB Atlas (External, Free)

Production Environment:  
├── PostgreSQL → Azure Database (B1ms, Budget-optimized)
└── MongoDB → Azure Cosmos DB (400 RU/s, Auto-pause)

Monitoring → Application Insights
```

### Infrastructure Components:
- **App Services**: B1 tier (cost-optimized)
- **Application Insights**: Monitoring & logging
- **Virtual Network**: Security & isolation
- **External Databases**: Neon PostgreSQL + MongoDB Atlas

---

## 🚀 HƯỚNG DẪN SETUP TỪNG BƯỚC

### BƯỚC 1: Chuẩn bị Azure Account (20 phút)

#### 1.1 Tạo Azure Account
```bash
# Đăng ký tại: https://azure.microsoft.com/free/students/
# Với email sinh viên (.edu) → $100 credit
# Hoặc email thường → $200 credit
```

#### 1.2 Install Azure CLI
```bash
# Ubuntu/WSL:
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS:
brew install azure-cli

# Windows: Download từ Microsoft docs
```

#### 1.3 Login và Setup
```bash
# 1. Login vào Azure
az login

# 2. Kiểm tra subscription
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 3. Tạo Resource Group cho Terraform state
az group create --name "rg-warehouse-terraform-state" --location "eastasia"
```

#### 1.4 Tạo Storage Account (Manual - qua Portal)
```
1. Vào: https://portal.azure.com
2. Search: "Storage accounts" → Create
3. Fill:
   - Subscription: Azure for Students
   - Resource group: rg-warehouse-terraform-state  
   - Storage name: warehouse123 (unique name)
   - Region: East Asia
   - Performance: Standard, Redundancy: LRS
4. Create
```

#### 1.5 Tạo Container và Service Principal
```bash
# Tạo container cho Terraform state
az storage container create --name "tfstate" --account-name "warehouse123"

# Tạo Service Principal cho GitHub Actions
az ad sp create-for-rbac --name "warehouse-github-actions" \
  --role contributor \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --query '{clientId: appId, clientSecret: password, subscriptionId: "YOUR_SUBSCRIPTION_ID", tenantId: tenant}' \
  --output json
```

**→ Lưu lại output để dùng ở bước 2**

---

### BƯỚC 2: Cấu hình GitHub Secrets (15 phút)

Vào GitHub Repository → Settings → Secrets and variables → Actions → New repository secret:

#### 🔑 Azure Authentication:
```
AZURE_CLIENT_ID = "xxx-từ-service-principal-xxx"
AZURE_CLIENT_SECRET = "xxx-từ-service-principal-xxx"
AZURE_SUBSCRIPTION_ID = "45c689f9-48ac-4c1f-94ba-1f700ecd5bb7"
AZURE_TENANT_ID = "xxx-từ-service-principal-xxx"
```

#### 📦 Terraform State:
```
TERRAFORM_STATE_RG = "rg-warehouse-terraform-state"
TERRAFORM_STATE_STORAGE = "warehouse123"
```

#### 🗄️ Database Configuration:

**External Database URLs (for Staging):**
```
EXTERNAL_POSTGRES_URL = "postgresql://neondb_owner:npg_Kirg6TH2xhtD@ep-shy-sun-a1gihjly-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

EXTERNAL_MONGODB_URL = "mongodb+srv://quocpro12334_db_user:N16obV0JlC2uuy5L@warehouse-mongodb-clust.szotwar.mongodb.net/?retryWrites=true&w=majority&appName=warehouse-mongodb-cluster"
```

**Azure Database Credentials (for Production):**
```
POSTGRES_ADMIN_USERNAME = "warehouse_admin"
POSTGRES_ADMIN_PASSWORD_PRODUCTION = "YourSecureProductionPassword123!"
```

#### 🔐 JWT Secrets:
```bash
# Generate strong secrets:
openssl rand -base64 32  # For staging access
openssl rand -base64 32  # For staging refresh
openssl rand -base64 32  # For production access  
openssl rand -base64 32  # For production refresh
```
```
JWT_ACCESS_SECRET_STAGING = "generated-secret-1"
JWT_REFRESH_SECRET_STAGING = "generated-secret-2"
JWT_ACCESS_SECRET_PRODUCTION = "generated-secret-3"
JWT_REFRESH_SECRET_PRODUCTION = "generated-secret-4"
```

#### 📧 Monitoring:
```
ALERT_EMAIL_1 = "your-email@gmail.com"
```

---

### BƯỚC 3: Deploy Infrastructure (15 phút)

#### 3.1 Deploy Staging Environment
```bash
# Đảm bảo đang ở develop branch
git checkout develop
git push origin develop

# Hoặc manual deploy:
# GitHub → Actions → Deploy Infrastructure → Run workflow
# Environment: staging, Action: apply
```

#### 3.2 Deploy Production (khi cần)
```bash
git checkout main
git push origin main

# Hoặc manual deploy production
```

---

### BƯỚC 4: Deploy Applications (10 phút)

```bash
# Push code để trigger deployment
git add .
git commit -m "Deploy applications to Azure"
git push origin develop  # staging
# git push origin main    # production khi cần
```

**Monitor deployment**: GitHub → Actions → Deploy Applications

---

### BƯỚC 5: Test & Verify (10 phút)

#### 5.1 Get Application URLs
```bash
# Vào Azure Portal:
# Resource Groups → rg-warehouse-mgmt-staging
# App Services → warehouse-mgmt-staging-frontend
# Copy URL
```

#### 5.2 Test Application
1. **Frontend**: Truy cập URL từ Azure
2. **API**: Test đăng ký/đăng nhập
3. **Database**: Verify data được lưu vào Neon/MongoDB Atlas

#### 5.3 Monitor Costs
```bash
# Azure Portal → Cost Management → Budgets
# Set budget alerts tại $50 (warning) và $65 (critical)
```

---

## 🔧 Quản lý Chi phí & Azure Credits

### Multi-Account Strategy (Khuyến nghị):
```
Member 1: $200 credit → Dùng tháng 1-2 ($70)
Member 2: $200 credit → Dùng tháng 3 ($35)
──────────────────────────────────────────
Total: $105 < $300 budget
Buffer: $195 cho unexpected costs
```

### Credit Switching Process:
1. **Monitor daily**: Azure Portal → Cost Management
2. **When credits < $50**: Switch to team member's account
3. **Backup state**: Export Terraform state
4. **Update GitHub Secrets**: New Azure credentials
5. **Re-deploy**: Infrastructure on new account

### Cost Optimization Tips:
- **Stop resources** khi không cần: `az webapp stop`
- **Use staging only** trong development
- **Deploy production** chỉ khi demo/presentation
- **Monitor alerts** daily để tránh overage

---

## 🔄 CI/CD Workflows

### 1. Code Quality Check (`code-check.yml`)
- **Triggers**: Push/PR to main/develop with code changes  
- **Actions**: ESLint, Prettier, TypeScript checking
- **Duration**: ~3 phút

### 2. Deploy Infrastructure (`deploy-infrastructure.yml`)
- **Triggers**: Push to main/develop with IaC changes
- **Actions**: Terraform plan/apply for staging/production
- **Duration**: ~5-10 phút

### 3. Deploy Applications (`deploy-apps.yml`)
- **Triggers**: Push to main/develop with app changes
- **Actions**: Build → Docker → Deploy to Azure App Services
- **Dependencies**: Code check → Build → Deploy
- **Duration**: ~10-15 phút

### Deployment Flow:
```
develop branch → staging environment
main branch → production environment  
```

---

## 🛠️ Troubleshooting

### ❌ "Terraform init failed"
```bash
# Solution: Check Azure credentials
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### ❌ "Database connection failed"  
```bash
# Check external database URLs in GitHub Secrets
# Verify Neon PostgreSQL và MongoDB Atlas đang online
```

### ❌ "GitHub Actions failed"
```bash
# Check tất cả required secrets đã được add
# Verify Azure credentials chưa expired
```

### ❌ "Credits exceeded"
```bash
# Switch to team member's Azure account
# Update GitHub Secrets với credentials mới
# Re-deploy infrastructure
```

---

## 📱 Demo Preparation

### 1 tuần trước demo:
```bash
# 1. Ensure có đủ credits
az consumption usage list --output table

# 2. Deploy production environment
git checkout main && git push origin main

# 3. Test tất cả tính năng
# 4. Backup data quan trọng
```

### Demo Script:
1. **Show Azure Portal**: Infrastructure overview
2. **Frontend Demo**: Live application features
3. **Backend API**: Postman/Swagger testing  
4. **Monitoring**: Application Insights dashboard
5. **Cost Management**: Budget và usage tracking
6. **CI/CD**: GitHub Actions pipeline

### Sau demo:
```bash
# Scale down để tiết kiệm
az webapp stop --name "warehouse-mgmt-production-frontend" --resource-group "rg-warehouse-mgmt-production"
az webapp stop --name "warehouse-mgmt-production-backend" --resource-group "rg-warehouse-mgmt-production"
```

---

## 📊 Project Structure

```
Warehouse-and-Supply-Chain-Management-System/
├── backend/                    # NestJS API
│   ├── src/                   # Source code
│   ├── prisma/                # Database schema
│   ├── Dockerfile.prod        # Production container
│   └── .env                   # Environment variables
├── frontend/                   # React Application  
│   ├── src/                   # React components
│   ├── public/                # Static assets
│   └── Dockerfile.prod        # Production container
├── iac/                       # Infrastructure as Code
│   ├── modules/               # Reusable Terraform modules
│   ├── environments/          # Environment configs
│   └── scripts/               # Utility scripts
└── .github/workflows/         # CI/CD pipelines
    ├── code-check.yml         # Code quality
    ├── deploy-infrastructure.yml # Infrastructure
    └── deploy-apps.yml        # Applications
```

---

## ✅ Checklist Hoàn thành

### Infrastructure:
- [ ] Azure account setup với credits
- [ ] Storage account cho Terraform state  
- [ ] Service Principal cho GitHub Actions
- [ ] GitHub Secrets configured
- [ ] Staging environment deployed
- [ ] Production environment deployed (khi cần)

### Application:
- [ ] Frontend deployed và accessible
- [ ] Backend API working
- [ ] Database connections working (Neon + MongoDB Atlas)
- [ ] Authentication (JWT) working
- [ ] All features tested

### Monitoring & Cost:
- [ ] Application Insights configured
- [ ] Budget alerts setup  
- [ ] Daily cost monitoring
- [ ] Team credit management strategy

### Documentation:
- [ ] Team có access to GitHub repo
- [ ] Database credentials shared securely
- [ ] Demo script prepared
- [ ] Backup plan for account switching

---

## 🆘 Support & Resources

- **GitHub Repository**: SE214-Semicolon/Warehouse-and-Supply-Chain-Management-System
- **Azure Portal**: https://portal.azure.com
- **Neon Database**: https://neon.tech (PostgreSQL)  
- **MongoDB Atlas**: https://cloud.mongodb.com
- **Application URLs**: Xem Azure Portal App Services

**Estimated Setup Time**: 1-2 giờ (với team support)
**Total Cost**: $70/tháng × 2 environments  
**Budget**: $210 cho 3 tháng (dưới $300 limit)

---

**🎯 Kết quả: Professional warehouse management system deployed on Azure with cost-optimized external databases, ready for demo và presentation!** 🚀

---

## 🔧 Advanced Configuration

#### Deploy Staging Environment

```bash
cd iac/environments/staging

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize Terraform
terraform init \
  -backend-config="resource_group_name=terraform-state-rg" \
  -backend-config="storage_account_name=youruniquename" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=staging/terraform.tfstate"

# Plan and apply
terraform plan
terraform apply
```

#### Deploy Production Environment

```bash
cd iac/environments/production

# Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your production values

# Initialize Terraform
terraform init \
  -backend-config="resource_group_name=terraform-state-rg" \
  -backend-config="storage_account_name=youruniquename" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=production/terraform.tfstate"

# Plan and apply
terraform plan
terraform apply
```

## 🔧 Configuration

### Environment Variables

Create `terraform.tfvars` file in each environment directory:

```hcl
# Basic Configuration
project_name = "warehouse-mgmt"
environment  = "staging"  # or "production"
location     = "Southeast Asia"

# Database Configuration
postgres_admin_username = "warehouse_admin"
postgres_admin_password = "your-secure-password"

# JWT Configuration
jwt_access_secret  = "your-jwt-access-secret"
jwt_refresh_secret = "your-jwt-refresh-secret"

# Monitoring
alert_email_addresses = [
  "admin@yourcompany.com",
  "devops@yourcompany.com"
]

# Tags
tags = {
  Project     = "Warehouse-Management-System"
  Environment = "staging"
  ManagedBy   = "Terraform"
  Owner       = "DevOps Team"
}
```

### Security Best Practices

1. **Use strong passwords** (min 12 chars for production)
2. **Use strong JWT secrets** (min 32 chars for production)
3. **Enable network security groups** (configured automatically)
4. **Use private subnets for databases** (configured automatically)
5. **Enable VNet integration** for App Services (configured automatically)
6. **Use managed identities** where possible (configured automatically)

## 🔄 CI/CD Pipeline

The project includes GitHub Actions workflows for automated deployment:

### Infrastructure Pipeline (`deploy-infrastructure.yml`)
- **Triggers**: Push to `main`/`develop` branches, manual dispatch
- **Staging**: Deploys on push to `develop` branch
- **Production**: Deploys on push to `main` branch
- **Features**: Plan validation, auto-approval, state management

### Application Pipeline (`deploy-apps.yml`)
- **Triggers**: Push to `main`/`develop` branches, manual dispatch
- **Features**: Build, test, containerize, deploy
- **Staging**: Direct deployment
- **Production**: Direct deployment with health checks

### Deployment Flow

1. **Development**: Push to `develop` branch → Staging deployment
2. **Production**: Push to `main` branch → Production deployment
3. **Manual**: Use workflow dispatch for specific deployments

## 📊 Monitoring and Alerts

### Application Insights
- Performance monitoring
- Error tracking
- Custom telemetry
- Live metrics

### Alerts Configured
- CPU usage > 70% (production) / 90% (staging)
- Memory usage > 70% (production) / 90% (staging)
- Response time > 5 seconds
- Database CPU/Memory > 80%
- Cosmos DB RU consumption > 80%

### Dashboards
- Application performance overview
- Infrastructure health
- Database performance
- Error tracking

## 💰 Cost Optimization

### Both Environments (Budget-Optimized)
- **Basic B1 App Service**: ~$14/month each
- **PostgreSQL Basic B1ms**: ~$20/month each  
- **Cosmos DB 400 RU/s**: ~$25/month each
- **Application Insights**: ~$5/month each
- **Storage & Networking**: ~$1/month each

**Total per environment: ~$65/month**
**Both environments: ~$130/month** (within $300 budget for 3 months)

### Cost Management Tips
1. **Use Azure Cost Management** to monitor spending
2. **Set up budget alerts** for cost control
3. **Review and optimize** resources monthly
4. **Use reserved instances** for production workloads
5. **Clean up unused resources** regularly

## 🔍 Troubleshooting

### Common Issues

#### Terraform State Lock
```bash
# If state is locked, force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

#### App Service Deployment Issues
```bash
# Check App Service logs
az webapp log tail --name <app-name> --resource-group <rg-name>

# Restart App Service
az webapp restart --name <app-name> --resource-group <rg-name>
```

#### Database Connection Issues
```bash
# Test database connectivity
az postgres flexible-server connect --name <server-name> --admin-user <username>
```

### Useful Commands

```bash
# Get infrastructure outputs
terraform output

# View App Service configuration
az webapp config show --name <app-name> --resource-group <rg-name>

# Check App Service health
curl -I https://<app-name>.azurewebsites.net/health

# View Application Insights metrics
az monitor metrics list --resource <app-insights-resource-id>
```

## 🚨 Disaster Recovery

### Backup Strategy
- **PostgreSQL**: Automated backups (7-35 days retention)
- **Cosmos DB**: Continuous backup with point-in-time restore
- **Application Code**: Stored in GitHub with version control
- **Infrastructure**: Terraform state backed up to Azure Storage

### Recovery Procedures
1. **Database Recovery**: Use Azure portal or CLI to restore from backup
2. **Application Recovery**: Redeploy from GitHub using CI/CD
3. **Infrastructure Recovery**: Run Terraform apply from backup state

## 📝 Maintenance

### Regular Tasks
- **Monthly**: Review costs and optimize resources
- **Quarterly**: Update Terraform modules and providers
- **Annually**: Review security configurations and certificates

### Updates
- **Terraform**: Keep modules updated with latest Azure provider
- **Azure Services**: Monitor Azure updates and deprecations
- **Security**: Regular security reviews and updates

## 🤝 Contributing

1. **Feature branches**: Create feature branches for changes
2. **Pull requests**: All changes must go through PR review
3. **Testing**: Test changes in staging before production
4. **Documentation**: Update documentation for infrastructure changes

## 📞 Support

For issues and questions:
1. **Check logs**: Application Insights and App Service logs
2. **Review metrics**: Azure Monitor dashboards
3. **Contact team**: Use configured alert email addresses
4. **Escalation**: Follow your organization's escalation procedures