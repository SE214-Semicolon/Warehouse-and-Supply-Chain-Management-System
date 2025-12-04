# Environment specific variables for staging
variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "warehouse-mgmt"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "staging"
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
    Environment = "staging"
    ManagedBy   = "Terraform"
    CostCenter  = "Development"
  }
}

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
  description = "CORS origin for frontend (development URL)"
  type        = string
  default     = "http://localhost:5173"
}

# JWT Configuration
variable "jwt_access_secret" {
  description = "JWT access token secret"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.jwt_access_secret) >= 10
    error_message = "JWT access secret must be at least 10 characters long."
  }
}

variable "jwt_refresh_secret" {
  description = "JWT refresh token secret"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.jwt_refresh_secret) >= 10
    error_message = "JWT refresh secret must be at least 10 characters long."
  }
}

# Monitoring Configuration
variable "alert_email_addresses" {
  description = "List of email addresses to receive alerts"
  type        = list(string)
  default     = []
}

# Prometheus and Grafana Configuration
variable "enable_prometheus" {
  description = "Enable Azure Monitor Workspace (Prometheus)"
  type        = bool
  default     = false
}

variable "enable_grafana" {
  description = "Enable Azure Managed Grafana"
  type        = bool
  default     = false
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
