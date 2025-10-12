# Resource Group information
output "resource_group_name" {
  description = "Name of the created resource group"
  value       = module.resource_group.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = module.resource_group.location
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
output "backend_app_service_url" {
  description = "URL of the backend App Service"
  value       = module.app_service.backend_app_service_url
}

output "frontend_app_service_url" {
  description = "URL of the frontend App Service"
  value       = module.app_service.frontend_app_service_url
}

# Key Vault outputs
output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = module.key_vault.vault_uri
}

# Monitoring outputs
output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = module.monitoring.application_insights_instrumentation_key
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  value       = module.monitoring.log_analytics_workspace_id
}