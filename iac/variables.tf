# Common variables used across all environments
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "warehouse-mgmt"
}

variable "location" {
  description = "Azure location for resources"
  type        = string
  default     = "Southeast Asia"
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project   = "Warehouse-Management-System"
    ManagedBy = "Terraform"
  }
}

# Database configuration
variable "postgres_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "warehouse_admin"
}

variable "postgres_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "mongo_admin_username" {
  description = "MongoDB administrator username"
  type        = string
  default     = "mongo_admin"
}

variable "mongo_admin_password" {
  description = "MongoDB administrator password"
  type        = string
  sensitive   = true
}

# JWT secrets
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