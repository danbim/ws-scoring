output "registry_endpoint" {
  description = "Container registry endpoint"
  value       = scaleway_registry_namespace.main.endpoint
}

output "registry_namespace_id" {
  description = "Container registry namespace ID"
  value       = scaleway_registry_namespace.main.id
}

output "container_namespace_id" {
  description = "Serverless container namespace ID"
  value       = scaleway_container_namespace.main.id
}

output "container_id" {
  description = "Serverless container ID"
  value       = scaleway_container.main.id
}

output "container_url" {
  description = "Serverless container public URL"
  value       = "https://${scaleway_container.main.domain_name}"
}

output "database_id" {
  description = "Serverless SQL database ID"
  value       = scaleway_sdb_sql_database.main.id
}

output "database_url" {
  description = "Database connection string"
  value       = scaleway_sdb_sql_database.main.connection_string
  sensitive   = true
}

output "secret_id" {
  description = "Secret Manager secret ID for database credentials"
  value       = scaleway_secret.db_credentials.id
}
