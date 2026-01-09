# Container Registry namespace
resource "scaleway_registry_namespace" "main" {
  name        = var.app_name
  description = "Container registry for ${var.app_name}"
  is_public   = false
}

# Serverless Container namespace
resource "scaleway_container_namespace" "main" {
  name        = var.app_name
  description = "Serverless container namespace for ${var.app_name}"
}

# Serverless SQL Database (PostgreSQL)
resource "scaleway_sdb_sql_database" "main" {
  name    = var.app_name
  min_cpu = 0
  max_cpu = 1
}

# IAM Application for database access
resource "scaleway_iam_application" "db_access" {
  name        = "${var.app_name}-db-access"
  description = "Application for accessing the ${var.app_name} database"
}

# IAM Policy to grant database access
resource "scaleway_iam_policy" "db_access" {
  name           = "${var.app_name}-db-access-policy"
  description    = "Policy to grant database access to ${var.app_name} application"
  application_id = scaleway_iam_application.db_access.id

  rule {
    project_ids = [var.scw_project_id]
    permission_set_names = [
      "ServerlessSQLDatabaseReadWrite"
    ]
  }
}

# IAM API Key for database connection
resource "scaleway_iam_api_key" "db_access" {
  application_id = scaleway_iam_application.db_access.id
  description    = "API key for ${var.app_name} to access database"
}

# Build connection string using database endpoint and IAM API key
locals {
  database_connection_string = "postgres://${scaleway_iam_api_key.db_access.access_key}:${scaleway_iam_api_key.db_access.secret_key}@${scaleway_sdb_sql_database.main.endpoint}/${var.app_name}?sslmode=require"
}

# Secret Manager for database credentials
resource "scaleway_secret" "db_credentials" {
  name        = "${var.app_name}-db-credentials"
  description = "Database connection string for ${var.app_name}"
}

resource "scaleway_secret_version" "db_credentials" {
  secret_id = scaleway_secret.db_credentials.id
  data      = base64encode(local.database_connection_string)
}

# Serverless Container
resource "scaleway_container" "main" {
  name           = var.app_name
  namespace_id   = scaleway_container_namespace.main.id
  registry_image = "${scaleway_registry_namespace.main.endpoint}/${var.app_name}:latest"
  port           = 8080

  min_scale = 0
  max_scale = 1

  memory_limit = 256
  cpu_limit    = 70

  timeout = 300

  environment_variables = {
    NODE_ENV = "production"
  }

  secret_environment_variables = {
    POSTGRESQL_CONNECTION_STRING = scaleway_secret.db_credentials.id
  }

  deploy = false # Don't auto-deploy, GitHub Actions will handle
}
