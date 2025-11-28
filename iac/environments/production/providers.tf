terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration is in backend.tf
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  skip_provider_registration = true

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true # Prevent accidental deletion in production
    }

    key_vault {
      purge_soft_delete_on_destroy    = false # Don't purge in production
      recover_soft_deleted_key_vaults = true
    }
  }

  # Service Principal authentication (used in CI/CD)
  # These will be populated from ARM_* environment variables
  # Leave empty for local Azure CLI authentication
  # client_id     = var.azure_client_id     # Optional: from ARM_CLIENT_ID
  # client_secret = var.azure_client_secret # Optional: from ARM_CLIENT_SECRET
  # tenant_id     = var.azure_tenant_id     # Optional: from ARM_TENANT_ID
  # subscription_id = var.azure_subscription_id # Optional: from ARM_SUBSCRIPTION_ID
}
