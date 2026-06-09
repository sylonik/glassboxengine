variable "project_id" {
  description = "GCP project ID in which to enable the APIs."
  type        = string
}

variable "services" {
  description = "List of Google Cloud service (API) identifiers to enable."
  type        = list(string)
}
