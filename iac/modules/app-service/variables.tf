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

variable "app_subnet_id" {
  description = "ID of the application subnet"
  type        = string
}

# App Service Plan Configuration
variable "app_service_plan_sku" {
  description = "SKU for the App Service Plan"
  type        = string
  default     = "B1"  # Basic 1 for staging
}

variable "app_service_always_on" {
  description = "Should the app be loaded at all times"
  type        = bool
  default     = true
}

# Database Connection Strings
variable "postgres_connection_string" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "cosmos_mongodb_connection_string" {
  description = "Cosmos DB MongoDB connection string"
  type        = string
  sensitive   = true
}

# JWT Configuration
variable "jwt_access_secret" {
  description = "JWT access token secret"
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
}

# Monitoring
variable "application_insights_connection_string" {
  description = "Application Insights connection string"
  type        = string
  sensitive   = true
}

# App Settings
variable "backend_app_settings" {
  description = "Additional app settings for backend"
  type        = map(string)
  default     = {}
}

variable "frontend_app_settings" {
  description = "Additional app settings for frontend"
  type        = map(string)
  default     = {}
}

# Auto-scaling Configuration
variable "enable_autoscaling" {
  description = "Enable auto-scaling for the App Service Plan"
  type        = bool
  default     = false
}

variable "autoscale_capacity_default" {
  description = "Default number of instances"
  type        = number
  default     = 1
}

variable "autoscale_capacity_minimum" {
  description = "Minimum number of instances"
  type        = number
  default     = 1
}

variable "autoscale_capacity_maximum" {
  description = "Maximum number of instances"
  type        = number
  default     = 3
}

# Deployment Slots
variable "enable_deployment_slots" {
  description = "Enable deployment slots for blue-green deployment"
  type        = bool
  default     = false
}

variable "cors_origin" {
  description = "CORS origin URL for frontend"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}