variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "location" {
  description = "Azure location"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "database_subnet_id" {
  description = "ID of the database subnet"
  type        = string
}

variable "app_subnet_id" {
  description = "ID of the application subnet"
  type        = string
}

variable "postgres_private_dns_zone_id" {
  description = "ID of the PostgreSQL private DNS zone"
  type        = string
}

# PostgreSQL Variables
variable "postgres_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "warehouse_admin"
}

variable "postgres_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
  default     = null
}

variable "postgres_sku_name" {
  description = "PostgreSQL SKU name"
  type        = string
  default     = "B_Standard_B1ms"  # Basic tier for staging
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768  # 32GB
}

variable "postgres_storage_tier" {
  description = "PostgreSQL storage tier"
  type        = string
  default     = "P4"
}

variable "postgres_backup_retention_days" {
  description = "PostgreSQL backup retention days"
  type        = number
  default     = 7
}

variable "postgres_geo_redundant_backup_enabled" {
  description = "Enable geo-redundant backup for PostgreSQL"
  type        = bool
  default     = false
}

variable "postgres_high_availability_mode" {
  description = "PostgreSQL high availability mode"
  type        = string
  default     = "Disabled"
}

variable "allow_azure_services" {
  description = "Allow Azure services to access PostgreSQL"
  type        = bool
  default     = false
}

# Cosmos DB Variables
variable "mongo_admin_username" {
  description = "MongoDB administrator username"
  type        = string
  default     = "mongo_admin"
}

variable "mongo_admin_password" {
  description = "MongoDB administrator password"
  type        = string
  sensitive   = true
  default     = null
}

variable "cosmos_consistency_level" {
  description = "Cosmos DB consistency level"
  type        = string
  default     = "Session"
  validation {
    condition     = contains(["BoundedStaleness", "Eventual", "Session", "Strong", "ConsistentPrefix"], var.cosmos_consistency_level)
    error_message = "Consistency level must be one of: BoundedStaleness, Eventual, Session, Strong, ConsistentPrefix."
  }
}

variable "cosmos_enable_automatic_failover" {
  description = "Enable automatic failover for Cosmos DB"
  type        = bool
  default     = false
}

variable "cosmos_enable_multiple_write_locations" {
  description = "Enable multiple write locations for Cosmos DB"
  type        = bool
  default     = false
}

variable "cosmos_secondary_locations" {
  description = "Secondary locations for Cosmos DB"
  type = list(object({
    location          = string
    failover_priority = number
  }))
  default = []
}

variable "cosmos_throughput" {
  description = "Cosmos DB database throughput (RU/s)"
  type        = number
  default     = 400
}

variable "cosmos_collection_throughput" {
  description = "Cosmos DB collection throughput (RU/s)"
  type        = number
  default     = null  # Use database-level throughput
}

variable "cosmos_audit_logs_ttl_seconds" {
  description = "TTL for audit logs collection in seconds"
  type        = number
  default     = 2592000  # 30 days
}

variable "cosmos_allowed_ips" {
  description = "List of allowed IP ranges for Cosmos DB"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}