#!/bin/bash

# Cost optimization script for student projects
# This script helps manage Azure resources to minimize costs

set -e

ENVIRONMENT=${1:-budget}
ACTION=${2:-status}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}💰 Azure Cost Optimization Script${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo ""

case $ACTION in
  "status")
    echo -e "${BLUE}📊 Checking current cost status...${NC}"
    
    # Get current month's cost
    CURRENT_COST=$(az consumption usage list \
      --start-date $(date -d 'month ago' '+%Y-%m-01') \
      --end-date $(date '+%Y-%m-%d') \
      --query 'sum([].quantity)' -o tsv 2>/dev/null || echo "0")
    
    echo -e "${GREEN}Current month estimated cost: $${CURRENT_COST}${NC}"
    
    # List running resources
    echo -e "${YELLOW}🏃 Currently running resources:${NC}"
    az resource list --resource-group "warehouse-mgmt-${ENVIRONMENT}-rg" \
      --query '[].{Name:name, Type:type, Location:location}' \
      --output table 2>/dev/null || echo "No resources found or not logged in"
    ;;
    
  "shutdown")
    echo -e "${YELLOW}⏹️  Shutting down resources to save costs...${NC}"
    
    # Stop App Services
    echo "Stopping App Services..."
    az webapp stop --name "warehouse-mgmt-${ENVIRONMENT}-backend" --resource-group "warehouse-mgmt-${ENVIRONMENT}-rg" 2>/dev/null || echo "Backend not found"
    az webapp stop --name "warehouse-mgmt-${ENVIRONMENT}-frontend" --resource-group "warehouse-mgmt-${ENVIRONMENT}-rg" 2>/dev/null || echo "Frontend not found"
    
    echo -e "${GREEN}✅ Resources stopped. This will save ~70% of App Service costs.${NC}"
    echo -e "${YELLOW}💡 Database will continue running. Use 'destroy' to stop everything.${NC}"
    ;;
    
  "startup")
    echo -e "${GREEN}🚀 Starting up resources...${NC}"
    
    # Start App Services
    echo "Starting App Services..."
    az webapp start --name "warehouse-mgmt-${ENVIRONMENT}-backend" --resource-group "warehouse-mgmt-${ENVIRONMENT}-rg" 2>/dev/null || echo "Backend not found"
    az webapp start --name "warehouse-mgmt-${ENVIRONMENT}-frontend" --resource-group "warehouse-mgmt-${ENVIRONMENT}-rg" 2>/dev/null || echo "Frontend not found"
    
    echo -e "${GREEN}✅ Resources started.${NC}"
    
    # Wait a bit and check health
    echo "Waiting for services to be ready..."
    sleep 30
    
    BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://warehouse-mgmt-${ENVIRONMENT}-backend.azurewebsites.net/health" || echo "000")
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://warehouse-mgmt-${ENVIRONMENT}-frontend.azurewebsites.net/" || echo "000")
    
    if [ "$BACKEND_STATUS" = "200" ]; then
      echo -e "${GREEN}✅ Backend is healthy${NC}"
    else
      echo -e "${YELLOW}⚠️  Backend not ready yet (HTTP $BACKEND_STATUS)${NC}"
    fi
    
    if [ "$FRONTEND_STATUS" = "200" ]; then
      echo -e "${GREEN}✅ Frontend is healthy${NC}"
    else
      echo -e "${YELLOW}⚠️  Frontend not ready yet (HTTP $FRONTEND_STATUS)${NC}"
    fi
    ;;
    
  "destroy")
    echo -e "${RED}🗑️  DANGER: This will destroy ALL resources!${NC}"
    echo -e "${RED}This action cannot be undone!${NC}"
    echo ""
    read -p "Are you sure you want to destroy all resources? (type 'YES' to confirm): " CONFIRM
    
    if [ "$CONFIRM" = "YES" ]; then
      echo -e "${YELLOW}Destroying infrastructure...${NC}"
      cd "$(dirname "$0")/../environments/${ENVIRONMENT}"
      terraform destroy -auto-approve
      echo -e "${GREEN}✅ All resources destroyed. Costs stopped.${NC}"
    else
      echo -e "${BLUE}❌ Destruction cancelled.${NC}"
    fi
    ;;
    
  "deploy")
    echo -e "${GREEN}🚀 Deploying budget environment...${NC}"
    cd "$(dirname "$0")/../environments/${ENVIRONMENT}"
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
      echo -e "${YELLOW}⚠️  terraform.tfvars not found. Creating from example...${NC}"
      cp terraform.tfvars.example terraform.tfvars
      echo -e "${RED}🔧 Please edit terraform.tfvars with your values before continuing!${NC}"
      exit 1
    fi
    
    terraform init
    terraform plan
    echo ""
    echo -e "${YELLOW}💰 Estimated monthly cost: $15-50 depending on usage${NC}"
    echo ""
    read -p "Do you want to apply this plan? (y/N): " APPLY
    
    if [ "$APPLY" = "y" ] || [ "$APPLY" = "Y" ]; then
      terraform apply
      echo -e "${GREEN}✅ Deployment completed!${NC}"
      terraform output development_urls
    else
      echo -e "${BLUE}❌ Deployment cancelled.${NC}"
    fi
    ;;
    
  "budget")
    echo -e "${BLUE}💳 Budget and Cost Analysis${NC}"
    
    # Get resource group costs
    RG_NAME="warehouse-mgmt-${ENVIRONMENT}-rg"
    
    echo "Analyzing costs for resource group: $RG_NAME"
    
    # Current month costs
    az consumption usage list \
      --start-date $(date -d '1 month ago' '+%Y-%m-01') \
      --end-date $(date '+%Y-%m-%d') \
      --query '[?contains(instanceName, `'$RG_NAME'`)].{Resource:instanceName, Cost:quantity, Unit:unit}' \
      --output table 2>/dev/null || echo "Cost data not available or not logged in"
    
    echo ""
    echo -e "${YELLOW}💡 Cost Optimization Tips:${NC}"
    echo "1. Use 'shutdown' command when not actively developing"
    echo "2. Use 'destroy' command over weekends or long breaks"
    echo "3. F1 (Free) tier has 60 minutes/day limit - monitor usage"
    echo "4. Database costs continue even when apps are stopped"
    echo "5. Set up budget alerts in Azure portal"
    ;;
    
  "schedule")
    echo -e "${BLUE}⏰ Resource Scheduling${NC}"
    echo "This would set up automatic start/stop scheduling"
    echo "Feature coming soon - currently use manual shutdown/startup"
    ;;
    
  *)
    echo -e "${BLUE}Usage: $0 [environment] [action]${NC}"
    echo ""
    echo "Actions:"
    echo "  status    - Check current resource status and costs"
    echo "  shutdown  - Stop App Services to save costs"
    echo "  startup   - Start App Services"
    echo "  deploy    - Deploy the budget environment"
    echo "  destroy   - Destroy ALL resources (saves maximum costs)"
    echo "  budget    - Show budget analysis and tips"
    echo "  schedule  - Set up automatic scheduling (coming soon)"
    echo ""
    echo "Examples:"
    echo "  $0 budget status"
    echo "  $0 budget shutdown"
    echo "  $0 budget startup"
    echo "  $0 budget deploy"
    ;;
esac