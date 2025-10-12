output "virtual_network_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "virtual_network_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "app_subnet_id" {
  description = "ID of the application subnet"
  value       = azurerm_subnet.app.id
}

output "database_subnet_id" {
  description = "ID of the database subnet"
  value       = azurerm_subnet.database.id
}

output "app_nsg_id" {
  description = "ID of the application network security group"
  value       = azurerm_network_security_group.app.id
}

output "database_nsg_id" {
  description = "ID of the database network security group"
  value       = azurerm_network_security_group.database.id
}

output "postgres_private_dns_zone_id" {
  description = "ID of the PostgreSQL private DNS zone"
  value       = azurerm_private_dns_zone.postgres.id
}