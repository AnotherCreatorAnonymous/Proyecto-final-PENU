data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# 1. Referencia a la Storage Account ya existente (con contenedor catalogo-img)
data "azurerm_storage_account" "main" {
  name                = "stpandelacasa"
  resource_group_name = var.storage_resource_group_name
}

# 2. Observabilidad: Log Analytics (30 días) + Application Insights
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "law-${var.project_name}-prod"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

resource "azurerm_application_insights" "appi" {
  name                = "appi-${var.project_name}-prod"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "Node.JS"
}

# 3. Frontend: Azure Static Web App (Free Tier)
resource "azurerm_static_web_app" "frontend" {
  name                = "swa-${var.project_name}-prod"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = "eastus2"
  sku_tier            = "Free"
  sku_size            = "Free"
}

# 4. Backend Serverless: Service Plan Consumo (Y1) + Linux Function App
resource "azurerm_service_plan" "functions_plan" {
  name                = "asp-${var.project_name}-prod"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "api" {
  name                       = "func-${var.project_name}-api"
  resource_group_name        = data.azurerm_resource_group.main.name
  location                   = data.azurerm_resource_group.main.location
  storage_account_name       = data.azurerm_storage_account.main.name
  storage_account_access_key = data.azurerm_storage_account.main.primary_access_key
  service_plan_id            = azurerm_service_plan.functions_plan.id
  https_only                 = true

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins = [
        "https://${azurerm_static_web_app.frontend.default_host_name}",
        "http://localhost:5173"
      ]
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"              = "node"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.appi.connection_string
    "MONGODB_URI"                           = var.mongodb_uri
    "JWT_SECRET"                            = var.jwt_secret
    "STAFF_PASSWORD"                        = var.staff_password
    "ADMIN_PASSWORD"                        = var.admin_password
  }
}

output "api_url" {
  value = "https://${azurerm_linux_function_app.api.default_hostname}"
}

output "frontend_url" {
  value = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "swa_deployment_token" {
  value     = azurerm_static_web_app.frontend.api_key
  sensitive = true
}