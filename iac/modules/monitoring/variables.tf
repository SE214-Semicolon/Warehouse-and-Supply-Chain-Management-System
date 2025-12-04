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

variable "send_emails_to_subscription_owners" {
  description = "Send alert emails to subscription owners"
  type        = bool
  default     = false
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

# ==========================================
# Prometheus Configuration
# ==========================================
variable "enable_prometheus" {
  description = "Enable Azure Monitor Workspace (Prometheus)"
  type        = bool
  default     = false
}

# ==========================================
# Grafana Configuration
# ==========================================
variable "enable_grafana" {
  description = "Enable Azure Managed Grafana"
  type        = bool
  default     = false
}

variable "grafana_major_version" {
  description = "Major version of Grafana (11)"
  type        = string
  default     = "11"
}

variable "grafana_sku" {
  description = "SKU for Azure Managed Grafana (Standard or Essential)"
  type        = string
  default     = "Standard"
}

variable "grafana_zone_redundancy" {
  description = "Enable zone redundancy for Grafana"
  type        = bool
  default     = false
}

variable "grafana_deterministic_outbound_ip" {
  description = "Enable deterministic outbound IP for Grafana"
  type        = bool
  default     = false
}

variable "grafana_public_network_access" {
  description = "Enable public network access for Grafana"
  type        = bool
  default     = true
}

variable "grafana_subscription_reader" {
  description = "Grant Grafana Monitoring Reader access to entire subscription"
  type        = bool
  default     = false
}

variable "grafana_admin_object_ids" {
  description = "List of Azure AD object IDs to grant Grafana Admin role"
  type        = list(string)
  default     = []
}
