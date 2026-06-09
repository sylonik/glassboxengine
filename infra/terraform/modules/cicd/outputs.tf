output "workload_identity_provider" {
  description = "Full resource name of the WIF provider — set as GitHub Actions secret/var WIF_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "cicd_service_account_email" {
  description = "Deploy service account email — set as GitHub Actions secret/var DEPLOY_SA."
  value       = google_service_account.cicd.email
}
