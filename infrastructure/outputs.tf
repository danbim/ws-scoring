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

output "database_id" {
  description = "Serverless SQL database ID"
  value       = scaleway_sdb_sql_database.main.id
}

output "database_endpoint" {
  description = "Database endpoint"
  value       = local.database_endpoint
  sensitive   = true
}

output "database_username" {
  description = "Database username"
  value       = local.database_username
  sensitive   = true
}

output "database_password" {
  description = "Database password"
  value       = local.database_password
  sensitive   = true
}

output "database_connection_string" {
  description = "Database connection string"
  value       = local.database_connection_string
  sensitive   = true
}
