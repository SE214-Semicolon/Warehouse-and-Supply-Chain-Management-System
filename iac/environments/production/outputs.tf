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

# Database outputs
output "postgres_server_fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = module.database.postgres_server_fqdn
}

output "postgres_database_name" {
  description = "Name of the PostgreSQL database"
  value       = module.database.postgres_database_name
}

output "cosmos_db_endpoint" {
  description = "Endpoint of the Cosmos DB account"
  value       = module.database.cosmos_db_endpoint
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

# Connection strings for deployment
output "postgres_connection_string" {
  description = "PostgreSQL connection string"
  value       = module.database.postgres_connection_string
  sensitive   = true
}

output "cosmos_mongodb_connection_string" {
  description = "Cosmos DB MongoDB connection string"
  value       = module.database.cosmos_mongodb_connection_string
  sensitive   = true
}