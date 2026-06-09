###############################################################################
# CI/CD — keyless GitHub Actions → GCP via Workload Identity Federation.
#
# No service-account keys (org policy blocks them anyway). GitHub's OIDC token
# is exchanged for short-lived credentials of a least-privilege deploy SA, and
# the federation is locked to ONE repository.
###############################################################################

data "google_project" "this" {
  project_id = var.project_id
}

# --- Workload Identity Pool + GitHub OIDC provider --------------------------
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"
  description               = "Keyless OIDC federation for GitHub Actions deploys"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub provider"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
  }

  # Hard gate: only tokens from THIS repository may use the pool.
  attribute_condition = "assertion.repository == \"${var.github_repo}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# --- Least-privilege deploy service account ---------------------------------
resource "google_service_account" "cicd" {
  project      = var.project_id
  account_id   = "glassbox-cicd"
  display_name = "GlassBox CI/CD deployer (GitHub Actions)"
}

# Roles needed to build-and-deploy the web service:
#  - run.admin           : create/update the Cloud Run service + revisions
#  - artifactregistry.writer : push the image
#  - serviceusage.serviceUsageConsumer : use project APIs
locals {
  cicd_project_roles = [
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/serviceusage.serviceUsageConsumer",
  ]
}

resource "google_project_iam_member" "cicd" {
  for_each = toset(local.cicd_project_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.cicd.email}"
}

# Deploying a Cloud Run service that RUNS AS the web runtime SA requires the
# deployer to actAs that SA.
resource "google_service_account_iam_member" "cicd_actas_web" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.web_runtime_sa_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cicd.email}"
}

# Same actAs grant for the demo storefront runtime SA so the deploy-demo CI job
# can deploy glassbox-demo running as that identity.
resource "google_service_account_iam_member" "cicd_actas_demo" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${var.demo_runtime_sa_email}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.cicd.email}"
}

# --- Bind the GitHub repo's OIDC identity to the deploy SA -------------------
# Only workflows from var.github_repo can impersonate the deploy SA.
resource "google_service_account_iam_member" "cicd_wif" {
  service_account_id = google_service_account.cicd.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.this.number}/locations/global/workloadIdentityPools/${google_iam_workload_identity_pool.github.workload_identity_pool_id}/attribute.repository/${var.github_repo}"
}
