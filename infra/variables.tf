variable "resource_group_name" {
  type    = string
  default = "rg-pandelacasa-prod"
}

variable "location" {
  type    = string
  default = "centralus"
}

variable "project_name" {
  type    = string
  default = "pandelacasa"
}

variable "mongodb_uri" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "staff_password" {
  type      = string
  sensitive = true
}

variable "admin_password" {
  type      = string
  sensitive = true
}

variable "storage_resource_group_name" {
  type    = string
  default = "rg-proyecto"
}