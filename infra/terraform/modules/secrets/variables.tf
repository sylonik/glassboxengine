variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "secret_ids" {
  description = "List of Secret Manager secret IDs to create (containers only; values set out-of-band)."
  type        = list(string)
}

variable "labels" {
  description = "Labels applied to every secret."
  type        = map(string)
  default     = {}
}
