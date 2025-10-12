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
    threshold        = 5  # 5 seconds
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
  name                    = "Failure Anomalies"
  application_insights_id = azurerm_application_insights.main.id
  enabled                 = true
  send_emails_to_subscription_owners = false
  
  dynamic "additional_email_recipients" {
    for_each = var.alert_email_addresses
    content {
      additional_email_recipients = [additional_email_recipients.value]
    }
  }
}

resource "azurerm_application_insights_smart_detection_rule" "performance_anomalies" {
  name                    = "Slow performing application"
  application_insights_id = azurerm_application_insights.main.id
  enabled                 = true
  send_emails_to_subscription_owners = false
  
  dynamic "additional_email_recipients" {
    for_each = var.alert_email_addresses
    content {
      additional_email_recipients = [additional_email_recipients.value]
    }
  }
}

# Dashboard for monitoring
resource "azurerm_portal_dashboard" "main" {
  count                = var.create_dashboard ? 1 : 0
  name                 = "${var.project_name}-${var.environment}-dashboard"
  resource_group_name  = var.resource_group_name
  location             = var.location
  
  dashboard_properties = templatefile("${path.module}/dashboard.tpl", {
    resource_group_name     = var.resource_group_name
    subscription_id         = var.subscription_id
    app_insights_name       = azurerm_application_insights.main.name
    log_analytics_name      = azurerm_log_analytics_workspace.main.name
    environment            = var.environment
    project_name           = var.project_name
  })

  tags = var.tags
}