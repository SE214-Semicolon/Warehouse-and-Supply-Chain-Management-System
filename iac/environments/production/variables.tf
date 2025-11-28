# Environment specific variables for production
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "warehouse-mgmt"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "location" {
  description = "Azure location"
  type        = string
  default     = "Southeast Asia"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Project     = "Warehouse-Management-System"
    Environment = "production"
    ManagedBy   = "Terraform"
    CostCenter  = "Production"
  }
}

# Azure Database Configuration for Production
# variable "postgres_admin_username" {
#   description = "PostgreSQL administrator username"
#   type        = string
#   default     = "warehouse_admin"
# }

# variable "postgres_admin_password" {
#   description = "PostgreSQL administrator password"
#   type        = string
#   sensitive   = true
#   validation {
#     condition     = length(var.postgres_admin_password) >= 12
#     error_message = "PostgreSQL password must be at least 12 characters long for production."
#   }
# }

# External Database Configuration
variable "external_postgres_url" {
  description = "External PostgreSQL connection URL (Neon Database)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "external_mongodb_url" {
  description = "External MongoDB connection URL (MongoDB Atlas)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "cors_origin" {
  description = "CORS origin for frontend (production URL)"
  type        = string
  default     = ""
}

# JWT Configuration
variable "jwt_access_secret" {
  description = "JWT access token secret"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.jwt_access_secret) >= 32
    error_message = "JWT access secret must be at least 32 characters long for production."
  }
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.jwt_refresh_secret) >= 32
    error_message = "JWT refresh secret must be at least 32 characters long for production."
  }
}

# Monitoring Configuration
variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  validation {
    condition     = length(var.alert_email_addresses) > 0
    error_message = "At least one alert email address must be provided for production."
  }
}

# Prometheus and Grafana Configuration
variable "enable_prometheus" {
  description = "Enable Azure Monitor Workspace (Prometheus)"
  type        = bool
  default     = true # Enabled by default for production
}

variable "enable_grafana" {
  description = "Enable Azure Managed Grafana"
  type        = bool
  default     = true # Enabled by default for production
}

variable "grafana_admin_object_ids" {
  description = "List of Azure AD object IDs to grant Grafana Admin role"
  type        = list(string)
  default     = []
}

# Docker Registry Configuration (for private ghcr.io)
variable "docker_registry_url" {
  description = "Docker registry URL"
  type        = string
  default     = "https://ghcr.io"
}

variable "docker_registry_username" {
  description = "Docker registry username (GitHub username for ghcr.io)"
  type        = string
  default     = ""
}

variable "docker_registry_password" {
  description = "Docker registry password (GitHub PAT with read:packages scope)"
  type        = string
  sensitive   = true
  default     = ""
}
