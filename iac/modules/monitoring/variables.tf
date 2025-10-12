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

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = null
}

# Log Analytics Configuration
variable "log_analytics_sku" {
  description = "SKU for Log Analytics workspace"
  type        = string
  default     = "PerGB2018"
}

variable "log_analytics_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Alert Configuration
variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  default     = []
}

# Resource IDs for monitoring
variable "app_service_ids" {
  description = "List of App Service IDs to monitor"
  type        = list(string)
  default     = []
}

variable "postgres_server_id" {
  description = "PostgreSQL server ID to monitor"
  type        = string
  default     = null
}

variable "cosmos_db_id" {
  description = "Cosmos DB account ID to monitor"
  type        = string
  default     = null
}

# Dashboard
variable "create_dashboard" {
  description = "Create a monitoring dashboard"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}