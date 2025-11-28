# Resource Group outputs
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.main.location
}

# Networking outputs
output "virtual_network_id" {
  description = "ID of the virtual network"
  value       = module.networking.virtual_network_id
}

output "app_subnet_id" {
  description = "ID of the application subnet"
  value       = module.networking.app_subnet_id
}

output "database_subnet_id" {
  description = "ID of the database subnet"
  value       = module.networking.database_subnet_id
}

# Database outputs (External databases for production)
output "postgres_server_fqdn" {
  description = "External PostgreSQL server FQDN (Neon Database)"
  value       = "external.neon.tech" # Placeholder for external database
}

output "postgres_database_name" {
  description = "External PostgreSQL database name"
  value       = "warehouse_mgmt_production" # Extract from connection string if needed
}

output "cosmos_db_endpoint" {
  description = "External MongoDB endpoint (MongoDB Atlas)"
  value       = "external.mongodb.net" # Placeholder for external database
  sensitive   = true
}

# App Service outputs
output "backend_app_service_name" {
  description = "Name of the backend App Service"
  value       = module.app_service.backend_app_service_name
}

output "backend_app_service_url" {
  description = "URL of the backend App Service"
  value       = module.app_service.backend_app_service_url
}

output "backend_staging_slot_url" {
  description = "URL of the backend staging slot"
  value       = module.app_service.backend_staging_slot_url
}

output "frontend_app_service_name" {
  description = "Name of the frontend App Service"
  value       = module.app_service.frontend_app_service_name
}

output "frontend_app_service_url" {
  description = "URL of the frontend App Service"
  value       = module.app_service.frontend_app_service_url
}

output "frontend_staging_slot_url" {
  description = "URL of the frontend staging slot"
  value       = module.app_service.frontend_staging_slot_url
}

# CDN outputs
output "cdn_profile_name" {
  description = "Name of the CDN profile"
  value       = azurerm_cdn_profile.main.name
}

output "cdn_endpoint_url" {
  description = "URL of the CDN endpoint"
  value       = "https://${azurerm_cdn_endpoint.frontend.fqdn}"
}

output "cdn_endpoint_fqdn" {
  description = "FQDN of the CDN endpoint"
  value       = azurerm_cdn_endpoint.frontend.fqdn
}

# Monitoring outputs
output "application_insights_name" {
  description = "Name of the Application Insights instance"
  value       = module.monitoring.application_insights_name
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.application_insights_instrumentation_key
  sensitive   = true
}

output "log_analytics_workspace_name" {
  description = "Name of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_name
}

# Connection strings for deployment (External databases)
output "postgres_connection_string" {
  description = "External PostgreSQL connection string"
  value       = var.external_postgres_url
  sensitive   = true
}

output "cosmos_mongodb_connection_string" {
  description = "External MongoDB connection string"
  value       = var.external_mongodb_url
  sensitive   = true
}

# Prometheus outputs
output "prometheus_workspace_id" {
  description = "ID of the Azure Monitor Workspace (Prometheus)"
  value       = module.monitoring.prometheus_workspace_id
}

output "prometheus_query_endpoint" {
  description = "Query endpoint for Prometheus metrics"
  value       = module.monitoring.prometheus_query_endpoint
}

# Grafana outputs
output "grafana_endpoint" {
  description = "Endpoint URL for Azure Managed Grafana"
  value       = module.monitoring.grafana_endpoint
}
