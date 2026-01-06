# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.project_name}-${var.environment}-plan"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = var.app_service_plan_sku

  tags = var.tags
}

# Backend App Service
resource "azurerm_linux_web_app" "backend" {
  name                = "${var.project_name}-${var.environment}-backend"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on                               = var.app_service_always_on
    container_registry_use_managed_identity = false

    application_stack {
      docker_image_name        = "ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/backend:${var.environment == "production" ? "latest" : "develop"}"
      docker_registry_url      = var.docker_registry_url
      docker_registry_username = var.docker_registry_username
      docker_registry_password = var.docker_registry_password
    }

    cors {
      allowed_origins     = [var.cors_origin, "https://${var.project_name}-${var.environment}-frontend.azurewebsites.net"]
      support_credentials = true
    }

    # Enable VNet integration
    vnet_route_all_enabled = true
  }

  # VNet Integration
  virtual_network_subnet_id = var.app_subnet_id

  app_settings = merge(
    var.backend_app_settings,
    {
      # App Configuration matching team's .env file
      NODE_ENV = var.environment == "production" ? "production" : "development"
      PORT     = "3000"

      # External Database URLs (Neon PostgreSQL + MongoDB Atlas)
      DATABASE_URL = var.postgres_connection_string
      MONGODB_URI  = var.cosmos_mongodb_connection_string
      MONGO_URL    = var.cosmos_mongodb_connection_string

      # JWT Configuration (same as team's .env)
      JWT_ACCESS_SECRET  = var.jwt_access_secret
      JWT_ACCESS_TTL     = "15m"
      JWT_REFRESH_SECRET = var.jwt_refresh_secret
      JWT_REFRESH_TTL    = "7d"

      # CORS Configuration
      CORS_ORIGIN = var.cors_origin

      # Docker Configuration
      DOCKER_ENABLE_CI = "true"
      RUN_MIGRATIONS   = "true"

      # Azure App Service Configuration
      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      WEBSITES_ENABLE_APP_SERVICE_STORAGE   = "false"
      WEBSITES_PORT                         = "3000"
    }
  )

  connection_string {
    name  = "DefaultConnection"
    type  = "PostgreSQL"
    value = var.postgres_connection_string
  }

  connection_string {
    name  = "MongoConnection"
    type  = "Custom"
    value = var.cosmos_mongodb_connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  logs {
    detailed_error_messages = true
    failed_request_tracing  = true

    application_logs {
      file_system_level = "Information"
    }

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 100
      }
    }
  }

  tags = var.tags
}

# Frontend App Service
resource "azurerm_linux_web_app" "frontend" {
  name                = "${var.project_name}-${var.environment}-frontend"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on                               = var.app_service_always_on
    container_registry_use_managed_identity = false

    application_stack {
      docker_image_name        = "ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/frontend:${var.environment == "production" ? "latest" : "develop"}"
      docker_registry_url      = var.docker_registry_url
      docker_registry_username = var.docker_registry_username
      docker_registry_password = var.docker_registry_password
    }

    # Enable VNet integration
    vnet_route_all_enabled = true
  }

  # VNet Integration
  virtual_network_subnet_id = var.app_subnet_id

  app_settings = merge(
    var.frontend_app_settings,
    {
      NODE_ENV         = var.environment == "production" ? "production" : "staging"
      VITE_API_URL     = "https://${var.project_name}-${var.environment}-backend.azurewebsites.net"
      VITE_ENVIRONMENT = var.environment

      # Docker Configuration
      DOCKER_ENABLE_CI = "true"

      APPLICATIONINSIGHTS_CONNECTION_STRING = var.application_insights_connection_string
      WEBSITES_ENABLE_APP_SERVICE_STORAGE   = "false"
      WEBSITES_PORT                         = "8080"
    }
  )

  identity {
    type = "SystemAssigned"
  }

  logs {
    detailed_error_messages = true
    failed_request_tracing  = true

    application_logs {
      file_system_level = "Information"
    }

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 100
      }
    }
  }

  tags = var.tags
}

# Auto-scaling settings for production
resource "azurerm_monitor_autoscale_setting" "main" {
  count               = var.enable_autoscaling ? 1 : 0
  name                = "${var.project_name}-${var.environment}-autoscale"
  resource_group_name = var.resource_group_name
  location            = var.location
  target_resource_id  = azurerm_service_plan.main.id

  profile {
    name = "default"

    capacity {
      default = var.autoscale_capacity_default
      minimum = var.autoscale_capacity_minimum
      maximum = var.autoscale_capacity_maximum
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 75
      }

      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.main.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 25
      }

      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }

  tags = var.tags
}

# Backend deployment slot for blue-green deployment (production only)
resource "azurerm_linux_web_app_slot" "backend_staging" {
  count          = var.enable_deployment_slots ? 1 : 0
  name           = "staging"
  app_service_id = azurerm_linux_web_app.backend.id

  site_config {
    always_on                               = var.app_service_always_on
    container_registry_use_managed_identity = false

    application_stack {
      docker_image_name   = "ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/backend:${var.environment == "production" ? "latest" : "develop"}"
      docker_registry_url = "https://ghcr.io"
    }

    cors {
      allowed_origins     = [var.cors_origin, "https://${var.project_name}-${var.environment}-frontend.azurewebsites.net"]
      support_credentials = true
    }

    vnet_route_all_enabled = true
  }

  virtual_network_subnet_id = var.app_subnet_id

  app_settings = azurerm_linux_web_app.backend.app_settings

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

# Frontend deployment slot for blue-green deployment (production only)
resource "azurerm_linux_web_app_slot" "frontend_staging" {
  count          = var.enable_deployment_slots ? 1 : 0
  name           = "staging"
  app_service_id = azurerm_linux_web_app.frontend.id

  site_config {
    always_on                               = var.app_service_always_on
    container_registry_use_managed_identity = false

    application_stack {
      docker_image_name   = "ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/frontend:${var.environment == "production" ? "latest" : "develop"}"
      docker_registry_url = "https://ghcr.io"
    }

    vnet_route_all_enabled = true
  }

  virtual_network_subnet_id = var.app_subnet_id

  app_settings = azurerm_linux_web_app.frontend.app_settings

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
