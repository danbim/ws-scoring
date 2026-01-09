terraform {
  required_version = ">= 1.0"

  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.0"
    }
  }

  backend "s3" {
    key                         = "terraform.tfstate"
    skip_credentials_validation = true
    skip_region_validation      = true
    # bucket, region, endpoint, access_key, and secret_key
    # will be provided via -backend-config flags during init
  }
}

provider "scaleway" {
  access_key      = var.scw_access_key
  secret_key      = var.scw_secret_key
  project_id      = var.scw_project_id
  organization_id = var.scw_organization_id
  region          = var.region
  zone            = var.zone
}
