###############################################################################
# Root variables
###############################################################################

variable "project_id" {
  description = "GCP project ID to deploy into."
  type        = string
}

variable "region" {
  description = "Primary GCP region for all regional resources."
  type        = string
  default     = "us-central1"
}

variable "name_prefix" {
  description = "Prefix used to name shared resources (VPC, connector, etc.)."
  type        = string
  default     = "glassbox"
}

# --- Image tags --------------------------------------------------------------
variable "web_image_tag" {
  description = "Tag of the glassbox-web image to deploy."
  type        = string
  default     = "latest"
}

variable "workers_image_tag" {
  description = "Tag of the glassbox-workers image to deploy."
  type        = string
  default     = "latest"
}

variable "demo_image_tag" {
  description = "Tag of the glassbox-demo image to deploy."
  type        = string
  default     = "latest"
}

variable "artifact_repository_id" {
  description = "Artifact Registry Docker repository ID."
  type        = string
  default     = "glassbox"
}

# --- Cloud SQL ---------------------------------------------------------------
variable "db_user" {
  description = "Application database user name."
  type        = string
  default     = "glassbox"
}

variable "db_password" {
  description = <<-EOT
    Password for the application database user. Supply at apply time via
    TF_VAR_db_password or -var; never commit it. This is used to CREATE the
    Cloud SQL user. The full DATABASE_URL is stored separately in Secret
    Manager and supplied out-of-band (see README).
  EOT
  type        = string
  sensitive   = true
}

variable "cloudsql_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-7680"
}

variable "cloudsql_availability_type" {
  description = "Cloud SQL availability: ZONAL or REGIONAL (REGIONAL = HA)."
  type        = string
  default     = "ZONAL"
}

variable "cloudsql_deletion_protection" {
  description = "Protect the Cloud SQL instance from deletion."
  type        = bool
  default     = true
}

# --- Redis -------------------------------------------------------------------
variable "redis_memory_size_gb" {
  description = "Memorystore (Redis) capacity in GB."
  type        = number
  default     = 1
}

# --- Cloud Run: web ----------------------------------------------------------
variable "web_min_instances" {
  description = "Minimum instances for glassbox-web. Keep >=1 in prod to avoid cold-start latency on the first request."
  type        = number
  default     = 1
}

variable "web_max_instances" {
  description = "Maximum instances for glassbox-web."
  type        = number
  default     = 10
}

variable "web_cpu" {
  description = "CPU limit for glassbox-web."
  type        = string
  default     = "1"
}

variable "web_memory" {
  description = "Memory limit for glassbox-web."
  type        = string
  default     = "1Gi"
}

# --- Cloud Run: workers ------------------------------------------------------
variable "workers_min_instances" {
  description = "Minimum instances for glassbox-workers (>=1 to always process the queue)."
  type        = number
  default     = 1
}

variable "workers_max_instances" {
  description = "Maximum instances for glassbox-workers."
  type        = number
  default     = 3
}

variable "workers_cpu" {
  description = "CPU limit for glassbox-workers."
  type        = string
  default     = "1"
}

variable "workers_memory" {
  description = "Memory limit for glassbox-workers."
  type        = string
  default     = "512Mi"
}

# --- Observability -----------------------------------------------------------
variable "otel_service_name" {
  description = "OTEL_SERVICE_NAME value injected into both services."
  type        = string
  default     = "glassbox-engine"
}

variable "otel_exporter_otlp_endpoint" {
  description = <<-EOT
    OTEL_EXPORTER_OTLP_ENDPOINT injected into both services. Point at your OTLP
    collector. To export directly to Cloud Trace, run an OTel Collector
    sidecar/agent with the googlecloud exporter, or use the GCP OTLP endpoint.
    Cloud Trace API is enabled by this stack. Leave empty to disable export.
  EOT
  type        = string
  default     = ""
}

# --- ClickHouse (EXTERNAL — not provisioned here) ----------------------------
# ClickHouse is intentionally OUT OF SCOPE for this Terraform. GCP has no
# managed ClickHouse. Provide a connection URL out-of-band via the
# CLICKHOUSE_URL secret. See README "ClickHouse (external)" for the two options:
#   1. ClickHouse Cloud  (recommended)
#   2. Self-host on a Compute Engine VM
# These variables only carry the non-secret database name into the env; the URL
# and credentials live in Secret Manager.
variable "clickhouse_database" {
  description = "ClickHouse database name (non-secret). The URL/credentials live in the CLICKHOUSE_URL secret."
  type        = string
  default     = "glassbox"
}

variable "github_repo" {
  type        = string
  description = "GitHub repo (owner/name) authorized for keyless CI/CD deploys."
  default     = "sylonik/glassboxengine"
}

# --- Demo storefront ---------------------------------------------------------
variable "demo_glassbox_endpoint" {
  description = "Base URL of the Glassbox engine the demo storefront calls (GLASSBOX_ENDPOINT)."
  type        = string
  default     = "https://glassbox-web-573736938351.us-central1.run.app"
}
