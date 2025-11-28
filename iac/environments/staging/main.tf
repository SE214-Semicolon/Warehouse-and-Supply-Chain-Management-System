# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}-rg"
  location = var.location

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  vnet_address_space                = ["10.1.0.0/16"]
  app_subnet_address_prefixes       = ["10.1.1.0/24"]
  database_subnet_address_prefixes  = ["10.1.2.0/24"]

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# External Databases Configuration
# Using Neon PostgreSQL + MongoDB Atlas (saves ~$35/month)
# No Azure databases needed for staging environment

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  subscription_id     = data.azurerm_client_config.current.subscription_id

  # Monitoring Configuration for Staging
  log_analytics_retention_days = 30
  alert_email_addresses       = var.alert_email_addresses
  create_dashboard           = true

  # Resource IDs will be set after app service creation
  app_service_ids    = []
  # No Azure databases - using external services

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# App Service Module
module "app_service" {
  source = "../../modules/app-service"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  app_subnet_id = module.networking.app_subnet_id

  # App Service Configuration for Staging (Basic tier)
  app_service_plan_sku = "B1"  # Basic 1 for staging
  app_service_always_on = false  # Can be false for staging to save costs

  # External Database connections (Neon PostgreSQL + MongoDB Atlas)
  postgres_connection_string         = var.external_postgres_url
  cosmos_mongodb_connection_string   = var.external_mongodb_url

  # JWT Configuration
  jwt_access_secret  = var.jwt_access_secret
  jwt_refresh_secret = var.jwt_refresh_secret
  
  # CORS Configuration
  cors_origin = var.cors_origin

  # Monitoring
  application_insights_connection_string = module.monitoring.application_insights_connection_string

  # Staging specific settings
  enable_autoscaling      = false  # No autoscaling for staging
  enable_deployment_slots = false  # No deployment slots for staging

  backend_app_settings = {
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
  }

  frontend_app_settings = {
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Update monitoring with app service IDs
resource "azurerm_monitor_metric_alert" "app_service_cpu" {
  count               = 2
  name                = "${var.project_name}-${var.environment}-cpu-alert-${count.index}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [count.index == 0 ? module.app_service.backend_app_service_id : module.app_service.frontend_app_service_id]
  description         = "Alert when CPU usage is high"
  severity            = 2
  frequency           = "PT5M"
  window_size         = "PT15M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "CpuTime"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 90  # Higher threshold for staging
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}