output "log_analytics_workspace_id" {
  description = "ID of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.id
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.main.name
}

output "application_insights_id" {
  description = "ID of the Application Insights instance"
  value       = azurerm_application_insights.main.id
}

output "application_insights_name" {
  description = "Name of the Application Insights instance"
  value       = azurerm_application_insights.main.name
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Connection string for Application Insights"
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}

output "action_group_id" {
  description = "ID of the monitor action group"
  value       = azurerm_monitor_action_group.main.id
}

output "dashboard_id" {
  description = "ID of the monitoring dashboard"
  value       = var.create_dashboard ? azurerm_portal_dashboard.main[0].id : null
}

# ==========================================
# Prometheus Outputs
# ==========================================
output "prometheus_workspace_id" {
  description = "ID of the Azure Monitor Workspace (Prometheus)"
  value       = var.enable_prometheus ? azurerm_monitor_workspace.prometheus[0].id : null
}

output "prometheus_workspace_name" {
  description = "Name of the Azure Monitor Workspace (Prometheus)"
  value       = var.enable_prometheus ? azurerm_monitor_workspace.prometheus[0].name : null
}

output "prometheus_query_endpoint" {
  description = "Query endpoint for Prometheus metrics"
  value       = var.enable_prometheus ? azurerm_monitor_workspace.prometheus[0].query_endpoint : null
}

output "prometheus_data_collection_endpoint_id" {
  description = "ID of the Prometheus Data Collection Endpoint"
  value       = var.enable_prometheus ? azurerm_monitor_data_collection_endpoint.prometheus[0].id : null
}

output "prometheus_data_collection_rule_id" {
  description = "ID of the Prometheus Data Collection Rule"
  value       = var.enable_prometheus ? azurerm_monitor_data_collection_rule.prometheus[0].id : null
}

# ==========================================
# Grafana Outputs
# ==========================================
output "grafana_id" {
  description = "ID of the Azure Managed Grafana instance"
  value       = var.enable_grafana ? azurerm_dashboard_grafana.main[0].id : null
}

output "grafana_name" {
  description = "Name of the Azure Managed Grafana instance"
  value       = var.enable_grafana ? azurerm_dashboard_grafana.main[0].name : null
}

output "grafana_endpoint" {
  description = "Endpoint URL for Grafana dashboard"
  value       = var.enable_grafana ? azurerm_dashboard_grafana.main[0].endpoint : null
}

output "grafana_identity_principal_id" {
  description = "Principal ID of the Grafana managed identity"
  value       = var.enable_grafana ? azurerm_dashboard_grafana.main[0].identity[0].principal_id : null
}
