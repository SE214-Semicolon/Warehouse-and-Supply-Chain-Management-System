terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.116.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for remote state
  #backend "azurerm" {
  # These values should be provided during terraform init
  # storage_account_name = "your-terraform-storage"
  # container_name      = "tfstate"
  # key                = "staging/terraform.tfstate"
  # resource_group_name = "your-terraform-rg"
  #}
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }

    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }

  # Skip provider registration to avoid permission issues
  skip_provider_registration = true

  # Service Principal authentication (used in CI/CD)
  # These will be populated from ARM_* environment variables
  # Leave empty for local Azure CLI authentication
  # client_id     = var.azure_client_id     # Optional: from ARM_CLIENT_ID
  # client_secret = var.azure_client_secret # Optional: from ARM_CLIENT_SECRET
  # tenant_id     = var.azure_tenant_id     # Optional: from ARM_TENANT_ID
  # subscription_id = var.azure_subscription_id # Optional: from ARM_SUBSCRIPTION_ID
}
