variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "web_sa_id" {
  description = "Account ID (prefix) for the web runtime service account."
  type        = string
  default     = "glassbox-web"
}

variable "workers_sa_id" {
  description = "Account ID (prefix) for the workers runtime service account."
  type        = string
  default     = "glassbox-workers"
}

variable "agent_sa_id" {
  description = "Account ID (prefix) for the Vertex AI Agent Engine service account."
  type        = string
  default     = "glassbox-agent"
}

variable "web_secret_ids" {
  description = "Secret Manager secret IDs the web SA is granted accessor on."
  type        = list(string)
  default     = []
}

variable "workers_secret_ids" {
  description = "Secret Manager secret IDs the workers SA is granted accessor on."
  type        = list(string)
  default     = []
}
