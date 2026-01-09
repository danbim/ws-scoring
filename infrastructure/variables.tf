variable "scw_access_key" {
  description = "Scaleway access key"
  type        = string
  sensitive   = true
}

variable "scw_secret_key" {
  description = "Scaleway secret key"
  type        = string
  sensitive   = true
}

variable "scw_project_id" {
  description = "Scaleway project ID"
  type        = string
}

variable "scw_organization_id" {
  description = "Scaleway organization ID"
  type        = string
}

variable "region" {
  description = "Scaleway region"
  type        = string
  default     = "fr-par"
}

variable "zone" {
  description = "Scaleway availability zone"
  type        = string
  default     = "fr-par-1"
}

variable "tf_state_bucket" {
  description = "S3 bucket name for Terraform state"
  type        = string
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "ws-scoring"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}
