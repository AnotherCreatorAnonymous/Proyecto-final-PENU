terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstatepandelacasa"
    container_name       = "tfstate"
    key                  = "pandelacasa-prod.tfstate"
  }
}

provider "azurerm" {
  features {}
}