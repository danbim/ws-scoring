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
  database_endpoint = scaleway_sdb_sql_database.main.endpoint
  database_username = scaleway_iam_application.db_access.id
  database_password = scaleway_iam_api_key.db_access.secret_key
  database_connection_string = replace(
    local.database_endpoint,
    "postgres://",
    "postgres://${local.database_username}:${local.database_password}@"
  )
}

# Secret Manager for database credentials
resource "scaleway_secret" "database_endpoint" {
  name        = "${var.app_name}-database-endpoint"
  description = "Database endpoint URL for ${var.app_name}"
}

resource "scaleway_secret_version" "database_endpoint" {
  secret_id = scaleway_secret.database_endpoint.id
  data      = local.database_endpoint
}

resource "scaleway_secret" "database_username" {
  name        = "${var.app_name}-database-username"
  description = "Database username for ${var.app_name}"
}

resource "scaleway_secret_version" "database_username" {
  secret_id = scaleway_secret.database_username.id
  data      = local.database_username
}

resource "scaleway_secret" "database_password" {
  name        = "${var.app_name}-database-password"
  description = "Database endpoint URL for ${var.app_name}"
}

resource "scaleway_secret_version" "database_password" {
  secret_id = scaleway_secret.database_password.id
  data      = local.database_password
}
