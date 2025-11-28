# ==========================================
# Resource Provider Registration
# ==========================================
resource "azurerm_resource_provider_registration" "monitor" {
  name = "Microsoft.Monitor"
}

resource "azurerm_resource_provider_registration" "dashboard" {
  name = "Microsoft.Dashboard"
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-${var.environment}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.log_analytics_sku
  retention_in_days   = var.log_analytics_retention_days

  tags = var.tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-${var.environment}-appinsights"
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"

  tags = var.tags
}

# Action Groups for Alerts
resource "azurerm_monitor_action_group" "main" {
  name                = "${var.project_name}-${var.environment}-alerts"
  resource_group_name = var.resource_group_name
  short_name          = substr("${var.project_name}-${var.environment}", 0, 12)

  dynamic "email_receiver" {
    for_each = var.alert_email_addresses
    content {
      name          = "email-${email_receiver.key}"
      email_address = email_receiver.value
    }
  }

  tags = var.tags
}

# Metric Alerts for App Services
resource "azurerm_monitor_metric_alert" "app_service_cpu" {
  count               = length(var.app_service_ids)
  name                = "${var.project_name}-${var.environment}-cpu-alert-${count.index}"
  resource_group_name = var.resource_group_name
  scopes              = [var.app_service_ids[count.index]]
  description         = "Alert when CPU usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "CpuPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "app_service_memory" {
  count               = length(var.app_service_ids)
  name                = "${var.project_name}-${var.environment}-memory-alert-${count.index}"
  resource_group_name = var.resource_group_name
  scopes              = [var.app_service_ids[count.index]]
  description         = "Alert when memory usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "MemoryPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "app_service_response_time" {
  count               = length(var.app_service_ids)
  name                = "${var.project_name}-${var.environment}-response-time-alert-${count.index}"
  resource_group_name = var.resource_group_name
  scopes              = [var.app_service_ids[count.index]]
  description         = "Alert when response time is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "AverageResponseTime"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 5 # 5 seconds
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Metric Alerts for Database
resource "azurerm_monitor_metric_alert" "postgres_cpu" {
  count               = var.postgres_server_id != null ? 1 : 0
  name                = "${var.project_name}-${var.environment}-postgres-cpu-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.postgres_server_id]
  description         = "Alert when PostgreSQL CPU usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "cpu_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

resource "azurerm_monitor_metric_alert" "postgres_memory" {
  count               = var.postgres_server_id != null ? 1 : 0
  name                = "${var.project_name}-${var.environment}-postgres-memory-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.postgres_server_id]
  description         = "Alert when PostgreSQL memory usage is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.DBforPostgreSQL/flexibleServers"
    metric_name      = "memory_percent"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Metric Alert for Cosmos DB
resource "azurerm_monitor_metric_alert" "cosmos_ru_consumption" {
  count               = var.cosmos_db_id != null ? 1 : 0
  name                = "${var.project_name}-${var.environment}-cosmos-ru-alert"
  resource_group_name = var.resource_group_name
  scopes              = [var.cosmos_db_id]
  description         = "Alert when Cosmos DB RU consumption is high"
  severity            = 2
  frequency           = "PT1M"
  window_size         = "PT5M"

  criteria {
    metric_namespace = "Microsoft.DocumentDB/databaseAccounts"
    metric_name      = "NormalizedRUConsumption"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.main.id
  }

  tags = var.tags
}

# Application Insights Smart Detection Rules
resource "azurerm_application_insights_smart_detection_rule" "failure_anomalies" {
  name                               = "Abnormal rise in exception volume"
  application_insights_id            = azurerm_application_insights.main.id
  enabled                            = true
  send_emails_to_subscription_owners = var.send_emails_to_subscription_owners
}

resource "azurerm_application_insights_smart_detection_rule" "performance_anomalies" {
  name                               = "Slow server response time"
  application_insights_id            = azurerm_application_insights.main.id
  enabled                            = true
  send_emails_to_subscription_owners = var.send_emails_to_subscription_owners
}

# Dashboard for monitoring
resource "azurerm_portal_dashboard" "main" {
  count               = var.create_dashboard ? 1 : 0
  name                = "${var.project_name}-${var.environment}-dashboard"
  resource_group_name = var.resource_group_name
  location            = var.location

  dashboard_properties = templatefile("${path.module}/dashboard.tpl", {
    resource_group_name = var.resource_group_name
    subscription_id     = var.subscription_id
    app_insights_name   = azurerm_application_insights.main.name
    log_analytics_name  = azurerm_log_analytics_workspace.main.name
    environment         = var.environment
    project_name        = var.project_name
  })

  tags = var.tags
}

# ==========================================
# Azure Monitor Workspace (Prometheus)
# ==========================================
resource "azurerm_monitor_workspace" "prometheus" {
  count               = var.enable_prometheus ? 1 : 0
  name                = "${var.project_name}-${var.environment}-prometheus"
  resource_group_name = var.resource_group_name
  location            = var.location

  tags = var.tags

  depends_on = [azurerm_resource_provider_registration.monitor]
}

# Data Collection Endpoint for Prometheus
resource "azurerm_monitor_data_collection_endpoint" "prometheus" {
  count                         = var.enable_prometheus ? 1 : 0
  name                          = "${var.project_name}-${var.environment}-prometheus-dce"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  kind                          = "Linux"
  public_network_access_enabled = true

  tags = var.tags
}

# Data Collection Rule for Prometheus metrics
resource "azurerm_monitor_data_collection_rule" "prometheus" {
  count                       = var.enable_prometheus ? 1 : 0
  name                        = "${var.project_name}-${var.environment}-prometheus-dcr"
  resource_group_name         = var.resource_group_name
  location                    = var.location
  data_collection_endpoint_id = azurerm_monitor_data_collection_endpoint.prometheus[0].id

  destinations {
    monitor_account {
      monitor_account_id = azurerm_monitor_workspace.prometheus[0].id
      name               = "MonitoringAccount"
    }
  }

  data_flow {
    streams      = ["Microsoft-PrometheusMetrics"]
    destinations = ["MonitoringAccount"]
  }

  data_sources {
    prometheus_forwarder {
      name    = "PrometheusDataSource"
      streams = ["Microsoft-PrometheusMetrics"]
    }
  }

  tags = var.tags
}

# ==========================================
# Azure Managed Grafana
# ==========================================
locals {
  # Grafana name must be 2-23 characters, letters/numbers/dashes only
  # Use fixed abbreviation for clarity: wh-scm-{env}-grafana
  env_short    = var.environment == "production" ? "prod" : (var.environment == "staging" ? "stg" : substr(var.environment, 0, 3))
  grafana_name = "wh-scm-${local.env_short}-grafana"
}

resource "azurerm_dashboard_grafana" "main" {
  count                             = var.enable_grafana ? 1 : 0
  name                              = local.grafana_name
  resource_group_name               = var.resource_group_name
  location                          = var.location
  grafana_major_version             = var.grafana_major_version
  sku                               = var.grafana_sku
  zone_redundancy_enabled           = var.grafana_zone_redundancy
  api_key_enabled                   = true
  deterministic_outbound_ip_enabled = var.grafana_deterministic_outbound_ip
  public_network_access_enabled     = var.grafana_public_network_access

  identity {
    type = "SystemAssigned"
  }

  azure_monitor_workspace_integrations {
    resource_id = var.enable_prometheus ? azurerm_monitor_workspace.prometheus[0].id : null
  }

  depends_on = [azurerm_resource_provider_registration.dashboard]

  tags = var.tags
}

# Grant Grafana access to Azure Monitor Workspace (Prometheus)
resource "azurerm_role_assignment" "grafana_prometheus_reader" {
  count                = var.enable_grafana && var.enable_prometheus ? 1 : 0
  scope                = azurerm_monitor_workspace.prometheus[0].id
  role_definition_name = "Monitoring Data Reader"
  principal_id         = azurerm_dashboard_grafana.main[0].identity[0].principal_id
}

# Grant Grafana access to Log Analytics Workspace
resource "azurerm_role_assignment" "grafana_log_analytics_reader" {
  count                = var.enable_grafana ? 1 : 0
  scope                = azurerm_log_analytics_workspace.main.id
  role_definition_name = "Log Analytics Reader"
  principal_id         = azurerm_dashboard_grafana.main[0].identity[0].principal_id
}

# Grant Grafana access to Application Insights
resource "azurerm_role_assignment" "grafana_app_insights_reader" {
  count                = var.enable_grafana ? 1 : 0
  scope                = azurerm_application_insights.main.id
  role_definition_name = "Monitoring Reader"
  principal_id         = azurerm_dashboard_grafana.main[0].identity[0].principal_id
}

# Grant Grafana access to subscription for resource discovery
resource "azurerm_role_assignment" "grafana_subscription_reader" {
  count                = var.enable_grafana && var.grafana_subscription_reader ? 1 : 0
  scope                = "/subscriptions/${var.subscription_id}"
  role_definition_name = "Monitoring Reader"
  principal_id         = azurerm_dashboard_grafana.main[0].identity[0].principal_id
}

# Grant Grafana Admin access to specified users
resource "azurerm_role_assignment" "grafana_admin" {
  for_each             = var.enable_grafana ? toset(var.grafana_admin_object_ids) : toset([])
  scope                = azurerm_dashboard_grafana.main[0].id
  role_definition_name = "Grafana Admin"
  principal_id         = each.value
}
