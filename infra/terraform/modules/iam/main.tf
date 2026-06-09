###############################################################################
# Module: iam
#
# Three least-privilege service accounts:
#
#   * web     — runtime identity for the glassbox-web Cloud Run service.
#   * workers — runtime identity for the glassbox-workers Cloud Run service.
#   * agent   — identity used by the Vertex AI Agent Engine agents (deployed
#               separately via agents-cli). We create the SA + grant
#               roles/aiplatform.user here so the agents can call Vertex AI.
#
# Project-level role grants:
#   web / workers : cloudsql.client (connect to Cloud SQL via proxy),
#                   cloudtrace.agent (export OTEL traces to Cloud Trace).
#   agent         : aiplatform.user.
#
# Secret access is granted per-secret (secretAccessor) so each SA can read only
# the secrets its service actually consumes.
###############################################################################

# --- Service accounts --------------------------------------------------------
resource "google_service_account" "web" {
  project      = var.project_id
  account_id   = var.web_sa_id
  display_name = "GlassBox Web (Cloud Run) runtime SA"
}

resource "google_service_account" "workers" {
  project      = var.project_id
  account_id   = var.workers_sa_id
  display_name = "GlassBox Workers (Cloud Run) runtime SA"
}

resource "google_service_account" "agent" {
  project      = var.project_id
  account_id   = var.agent_sa_id
  display_name = "GlassBox Vertex AI Agent Engine SA"
}

# Demo storefront runtime SA. Talks to the engine over public HTTPS only — no
# Cloud SQL / Redis / VPC — so it gets NO project-level roles, only a per-secret
# accessor on the demo's API key (granted below).
resource "google_service_account" "demo" {
  project      = var.project_id
  account_id   = var.demo_sa_id
  display_name = "GlassBox Demo Storefront (Cloud Run) runtime SA"
}

# --- Project-level roles: web ------------------------------------------------
locals {
  web_project_roles = [
    "roles/cloudsql.client",
    "roles/cloudtrace.agent",
  ]
  workers_project_roles = [
    "roles/cloudsql.client",
    "roles/cloudtrace.agent",
  ]
  agent_project_roles = [
    "roles/aiplatform.user",
  ]
}

resource "google_project_iam_member" "web" {
  for_each = toset(local.web_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "workers" {
  for_each = toset(local.workers_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.workers.email}"
}

resource "google_project_iam_member" "agent" {
  for_each = toset(local.agent_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.agent.email}"
}

# --- Per-secret accessor grants ---------------------------------------------
# var.web_secret_ids / var.workers_secret_ids are lists of Secret Manager
# secret IDs each service may read. Granting at the secret level (not project)
# keeps the blast radius minimal.
resource "google_secret_manager_secret_iam_member" "web" {
  for_each = toset(var.web_secret_ids)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web.email}"
}

resource "google_secret_manager_secret_iam_member" "workers" {
  for_each = toset(var.workers_secret_ids)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.workers.email}"
}

resource "google_secret_manager_secret_iam_member" "demo" {
  for_each = toset(var.demo_secret_ids)

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.demo.email}"
}
