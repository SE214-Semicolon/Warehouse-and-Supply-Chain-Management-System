# Random password for PostgreSQL if not provided
resource "random_password" "postgres" {
  count   = var.postgres_admin_password == null ? 1 : 0
  length  = 16
  special = true
}

# Random password for MongoDB if not provided  
resource "random_password" "mongo" {
  count   = var.mongo_admin_password == null ? 1 : 0
  length  = 16
  special = true
}

# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.project_name}-${var.environment}-postgres"
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "16"
  delegated_subnet_id    = var.database_subnet_id
  private_dns_zone_id    = var.postgres_private_dns_zone_id
  administrator_login    = var.postgres_admin_username
  administrator_password = var.postgres_admin_password != null ? var.postgres_admin_password : random_password.postgres[0].result
  zone                   = "1"

  storage_mb   = var.postgres_storage_mb
  storage_tier = var.postgres_storage_tier

  sku_name   = var.postgres_sku_name
  
  backup_retention_days        = var.postgres_backup_retention_days
  geo_redundant_backup_enabled = var.postgres_geo_redundant_backup_enabled

  authentication {
    active_directory_auth_enabled = false
    password_auth_enabled         = true
  }

  high_availability {
    mode = var.postgres_high_availability_mode
  }

  maintenance_window {
    day_of_week  = 0
    start_hour   = 8
    start_minute = 0
  }

  tags = var.tags

  depends_on = [var.postgres_private_dns_zone_id]
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "warehouse_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# PostgreSQL Firewall Rules (if needed for development)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  count            = var.allow_azure_services ? 1 : 0
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# Cosmos DB Account (MongoDB API)
resource "azurerm_cosmosdb_account" "main" {
  name                          = "${var.project_name}-${var.environment}-cosmos"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  offer_type                    = "Standard"
  kind                          = "MongoDB"
  mongo_server_version          = "4.2"
  enable_automatic_failover     = var.cosmos_enable_automatic_failover
  enable_multiple_write_locations = var.cosmos_enable_multiple_write_locations

  consistency_policy {
    consistency_level       = var.cosmos_consistency_level
    max_interval_in_seconds = 300
    max_staleness_prefix    = 100000
  }

  geo_location {
    location          = var.location
    failover_priority = 0
  }

  dynamic "geo_location" {
    for_each = var.cosmos_secondary_locations
    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.failover_priority
    }
  }

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "MongoDBv3.4"
  }

  capabilities {
    name = "EnableServerless"
  }

  # Network Access
  is_virtual_network_filter_enabled = true
  
  virtual_network_rule {
    subnet_id = var.app_subnet_id
  }

  virtual_network_rule {
    subnet_id = var.database_subnet_id
  }

  # IP Rules for development (optional)
  dynamic "ip_range_filter" {
    for_each = var.cosmos_allowed_ips
    content {
      ip_range_filter = ip_range_filter.value
    }
  }

  tags = var.tags
}

# Cosmos DB MongoDB Database
resource "azurerm_cosmosdb_mongo_database" "main" {
  name                = "warehouse_db"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  throughput          = var.cosmos_throughput
}

# Cosmos DB MongoDB Collections
resource "azurerm_cosmosdb_mongo_collection" "audit_logs" {
  name                = "audit_logs"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.main.name

  default_ttl_seconds = var.cosmos_audit_logs_ttl_seconds
  throughput          = var.cosmos_collection_throughput

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys = ["timestamp"]
  }

  index {
    keys = ["userId"]
  }

  index {
    keys = ["action"]
  }
}

resource "azurerm_cosmosdb_mongo_collection" "reports" {
  name                = "reports"
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name
  database_name       = azurerm_cosmosdb_mongo_database.main.name

  throughput = var.cosmos_collection_throughput

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys = ["reportType"]
  }

  index {
    keys = ["createdAt"]
  }
}