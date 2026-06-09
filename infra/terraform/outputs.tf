###############################################################################
# Root outputs
###############################################################################

# --- Cloud Run ---------------------------------------------------------------
output "web_service_url" {
  description = "Public URL of the glassbox-web Cloud Run service."
  value       = module.cloud_run_web.uri
}

output "workers_service_name" {
  description = "Name of the glassbox-workers Cloud Run service (internal, no public URL)."
  value       = module.cloud_run_workers.service_name
}

# --- Artifact Registry -------------------------------------------------------
output "artifact_registry_url" {
  description = "Base URL to push images to (append /<image>:<tag>)."
  value       = module.artifact_registry.repository_url
}

output "web_image" {
  description = "Fully qualified web image reference this stack expects."
  value       = local.web_image
}

output "workers_image" {
  description = "Fully qualified workers image reference this stack expects."
  value       = local.workers_image
}

# --- Cloud SQL ---------------------------------------------------------------
output "cloudsql_connection_name" {
  description = "Cloud SQL instance connection name (project:region:instance)."
  value       = module.cloud_sql.connection_name
}

output "cloudsql_private_ip" {
  description = "Private IP of the Cloud SQL instance."
  value       = module.cloud_sql.private_ip_address
}

output "database_name" {
  description = "Application database name."
  value       = module.cloud_sql.database_name
}

# --- Redis -------------------------------------------------------------------
output "redis_host" {
  description = "Private host/IP of the Memorystore Redis instance."
  value       = module.redis.host
}

output "redis_url" {
  description = "Convenience redis:// URL for the Memorystore instance."
  value       = module.redis.redis_url
}

# --- Networking --------------------------------------------------------------
output "vpc_connector_id" {
  description = "Serverless VPC Access connector ID."
  value       = module.network.vpc_connector_id
}

output "network_name" {
  description = "Name of the VPC network."
  value       = module.network.network_name
}

# --- IAM / service accounts --------------------------------------------------
output "web_service_account" {
  description = "Email of the web runtime service account."
  value       = module.iam.web_sa_email
}

output "workers_service_account" {
  description = "Email of the workers runtime service account."
  value       = module.iam.workers_sa_email
}

output "agent_service_account" {
  description = "Email of the Vertex AI Agent Engine service account (used by agents-cli deploys)."
  value       = module.iam.agent_sa_email
}

# --- Secrets -----------------------------------------------------------------
output "secret_ids" {
  description = "Secret Manager secret IDs created (values supplied out-of-band)."
  value       = module.secrets.secret_ids
}

output "cicd_workload_identity_provider" {
  description = "WIF provider resource name for the GitHub Actions auth step."
  value       = module.cicd.workload_identity_provider
}

output "cicd_service_account_email" {
  description = "CI/CD deploy service account email."
  value       = module.cicd.cicd_service_account_email
}
