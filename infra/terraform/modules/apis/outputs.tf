output "enabled_services" {
  description = "Map of enabled service identifiers to their google_project_service resources."
  value       = { for k, v in google_project_service.this : k => v.service }
}
