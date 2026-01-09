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

# Secret Manager for database credentials
resource "scaleway_secret" "db_credentials" {
  name        = "${var.app_name}-db-credentials"
  description = "Database connection string for ${var.app_name}"
}

resource "scaleway_secret_version" "db_credentials" {
  secret_id = scaleway_secret.db_credentials.id
  data      = scaleway_sdb_sql_database.main.connection_string
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
    PORT     = "8080"
  }

  secret_environment_variables {
    key       = "POSTGRESQL_CONNECTION_STRING"
    secret_id = scaleway_secret.db_credentials.id
  }

  deploy = false # Don't auto-deploy, GitHub Actions will handle
}
