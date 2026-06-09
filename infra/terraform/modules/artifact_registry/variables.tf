variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region (location) for the Artifact Registry repository."
  type        = string
}

variable "repository_id" {
  description = "Repository ID for the Docker repo."
  type        = string
  default     = "glassbox"
}
