output "web_sa_email" {
  description = "Email of the web runtime service account."
  value       = google_service_account.web.email
}

output "workers_sa_email" {
  description = "Email of the workers runtime service account."
  value       = google_service_account.workers.email
}

output "agent_sa_email" {
  description = "Email of the Vertex AI Agent Engine service account."
  value       = google_service_account.agent.email
}
