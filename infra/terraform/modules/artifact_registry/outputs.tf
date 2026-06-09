output "repository_id" {
  description = "The repository ID."
  value       = google_artifact_registry_repository.this.repository_id
}

output "repository_name" {
  description = "Fully qualified repository resource name."
  value       = google_artifact_registry_repository.this.name
}

output "repository_url" {
  description = "Base URL operators push images to (append /<image>:<tag>)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}
