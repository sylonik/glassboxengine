variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "github_repo" {
  type        = string
  description = "GitHub repository in 'owner/name' form, e.g. sylonik/glassboxengine."
}

variable "web_runtime_sa_email" {
  type        = string
  description = "Runtime service account email of the Cloud Run web service (deployer must actAs it)."
}

variable "demo_runtime_sa_email" {
  type        = string
  description = "Runtime service account email of the Cloud Run demo storefront service (deployer must actAs it)."
}
