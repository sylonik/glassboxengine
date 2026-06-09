output "secret_ids" {
  description = "Map of secret ID -> secret_id (the short name)."
  value       = { for k, v in google_secret_manager_secret.this : k => v.secret_id }
}

output "secret_names" {
  description = "Map of secret ID -> fully qualified secret resource name."
  value       = { for k, v in google_secret_manager_secret.this : k => v.name }
}
