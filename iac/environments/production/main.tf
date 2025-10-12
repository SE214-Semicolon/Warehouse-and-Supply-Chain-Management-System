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

  vnet_address_space                = ["10.0.0.0/16"]
  app_subnet_address_prefixes       = ["10.0.1.0/24"]
  database_subnet_address_prefixes  = ["10.0.2.0/24"]

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Azure Databases for Production (Professional Demo Setup)
module "database" {
  source = "../../modules/database"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name

  database_subnet_id            = module.networking.database_subnet_id
  app_subnet_id                = module.networking.app_subnet_id
  postgres_private_dns_zone_id = module.networking.postgres_private_dns_zone_id

  # PostgreSQL Configuration (Budget-optimized B1ms)
  postgres_admin_username      = var.postgres_admin_username
  postgres_admin_password      = var.postgres_admin_password
  postgres_sku_name           = "B_Standard_B1ms"     # Basic 1ms (cheapest)
  postgres_storage_mb         = 32768                 # 32GB (minimum)
  postgres_storage_tier       = "P4"
  postgres_backup_retention_days = 7                 # Minimum for production
  postgres_geo_redundant_backup_enabled = false
  postgres_high_availability_mode = "Disabled"

  # Cosmos DB Configuration (Auto-pause enabled)
  cosmos_consistency_level           = "Session"
  cosmos_enable_automatic_failover   = false
  cosmos_enable_multiple_write_locations = false
  cosmos_throughput                  = 400   # Minimum RU/s
  cosmos_collection_throughput       = null  # Use database-level throughput
  cosmos_audit_logs_ttl_seconds      = 1296000  # 15 days

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name        = var.project_name
  environment         = var.environment
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  subscription_id     = data.azurerm_client_config.current.subscription_id

  # Monitoring Configuration for Production
  log_analytics_retention_days = 90  # Longer retention for production
  alert_email_addresses       = var.alert_email_addresses
  create_dashboard           = true

  # Resource IDs will be set after app service creation
  app_service_ids    = []
  postgres_server_id = module.database.postgres_server_id
  cosmos_db_id       = module.database.cosmos_db_id

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

  # App Service Configuration for Production (Budget-optimized)
  app_service_plan_sku = "B1"   # Basic B1 for cost optimization
  app_service_always_on = false # Disable always on to save cost

  # Database connections
  postgres_connection_string         = module.database.postgres_connection_string
  cosmos_mongodb_connection_string   = module.database.cosmos_mongodb_connection_string

  # JWT Configuration
  jwt_access_secret  = var.jwt_access_secret
  jwt_refresh_secret = var.jwt_refresh_secret

  # Monitoring
  application_insights_connection_string = module.monitoring.application_insights_connection_string

  # Production specific settings
  enable_autoscaling      = true   # Enable autoscaling for production
  enable_deployment_slots = true   # Enable deployment slots for blue-green deployment

  autoscale_capacity_default = 2
  autoscale_capacity_minimum = 1
  autoscale_capacity_maximum = 5

  backend_app_settings = {
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    WEBSITE_RUN_FROM_PACKAGE = "1"
  }

  frontend_app_settings = {
    WEBSITE_NODE_DEFAULT_VERSION = "20-lts"
    SCM_DO_BUILD_DURING_DEPLOYMENT = "true"
    WEBSITE_RUN_FROM_PACKAGE = "1"
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Azure Front Door for CDN and global load balancing
resource "azurerm_cdn_profile" "main" {
  name                = "${var.project_name}-${var.environment}-cdn"
  location            = "Global"
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard_Microsoft"

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

resource "azurerm_cdn_endpoint" "frontend" {
  name                = "${var.project_name}-${var.environment}-frontend-cdn"
  profile_name        = azurerm_cdn_profile.main.name
  location            = "Global"
  resource_group_name = azurerm_resource_group.main.name

  origin {
    name      = "frontend-origin"
    host_name = replace(module.app_service.frontend_app_service_url, "https://", "")
  }

  origin_host_header = replace(module.app_service.frontend_app_service_url, "https://", "")

  # Caching rules for better performance
  global_delivery_rule {
    cache_expiration_action {
      behavior = "Override"
      duration = "1.00:00:00"  # 1 day
    }

    cache_key_query_string_action {
      behavior   = "IncludeAll"
      parameters = "version,lang"
    }
  }

  delivery_rule {
    name  = "EnforceHTTPS"
    order = 1

    request_scheme_condition {
      operator     = "Equal"
      match_values = ["HTTP"]
    }

    url_redirect_action {
      redirect_type = "Found"
      protocol      = "Https"
    }
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

# Update monitoring with app service IDs and stricter thresholds
resource "azurerm_monitor_metric_alert" "app_service_cpu" {
  count               = 2
  name                = "${var.project_name}-${var.environment}-cpu-alert-${count.index}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [count.index == 0 ? module.app_service.backend_app_service_id : module.app_service.frontend_app_service_id]
  description         = "Alert when CPU usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "CpuPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 70  # Lower threshold for production
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}

resource "azurerm_monitor_metric_alert" "app_service_memory" {
  count               = 2
  name                = "${var.project_name}-${var.environment}-memory-alert-${count.index}"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [count.index == 0 ? module.app_service.backend_app_service_id : module.app_service.frontend_app_service_id]
  description         = "Alert when memory usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "MemoryPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 70  # Lower threshold for production
  }

  action {
    action_group_id = module.monitoring.action_group_id
  }

  tags = merge(var.tags, {
    Environment = var.environment
  })
}