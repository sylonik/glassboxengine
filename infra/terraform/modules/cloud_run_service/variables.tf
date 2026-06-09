variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for the Cloud Run service."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name."
  type        = string
}

variable "image" {
  description = "Fully qualified container image (e.g. <region>-docker.pkg.dev/<project>/<repo>/<image>:<tag>)."
  type        = string
}

variable "service_account_email" {
  description = "Runtime service account email."
  type        = string
}

variable "ingress" {
  description = "Ingress setting (INGRESS_TRAFFIC_ALL for public web, INGRESS_TRAFFIC_INTERNAL_ONLY for workers)."
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"

  validation {
    condition = contains([
      "INGRESS_TRAFFIC_ALL",
      "INGRESS_TRAFFIC_INTERNAL_ONLY",
      "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER",
    ], var.ingress)
    error_message = "ingress must be a valid Cloud Run v2 ingress value."
  }
}

variable "vpc_connector_id" {
  description = "Serverless VPC Access connector ID for VPC egress."
  type        = string
}

variable "vpc_egress" {
  description = "VPC egress mode: ALL_TRAFFIC or PRIVATE_RANGES_ONLY."
  type        = string
  default     = "PRIVATE_RANGES_ONLY"

  validation {
    condition     = contains(["ALL_TRAFFIC", "PRIVATE_RANGES_ONLY"], var.vpc_egress)
    error_message = "vpc_egress must be ALL_TRAFFIC or PRIVATE_RANGES_ONLY."
  }
}

variable "cloudsql_connection_names" {
  description = "List of Cloud SQL instance connection names to attach (project:region:instance)."
  type        = list(string)
  default     = []
}

variable "container_port" {
  description = "Container port to expose. Set null for headless services (workers)."
  type        = number
  default     = null
}

variable "min_instances" {
  description = "Minimum instance count."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instance count."
  type        = number
  default     = 10
}

variable "cpu" {
  description = "CPU limit per instance."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memory limit per instance."
  type        = string
  default     = "512Mi"
}

variable "cpu_always_allocated" {
  description = "Keep CPU allocated outside request scope (required for background workers)."
  type        = bool
  default     = false
}

variable "max_concurrency" {
  description = "Max concurrent requests per instance."
  type        = number
  default     = 80
}

variable "request_timeout" {
  description = "Request timeout (e.g. \"300s\")."
  type        = string
  default     = "300s"
}

variable "env" {
  description = "Plain (non-secret) environment variables."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = <<-EOT
    Secret-backed environment variables. Map of ENV_VAR_NAME => object with the
    Secret Manager secret_id and version (use "latest" for the latest version).
  EOT
  type = map(object({
    secret_id = string
    version   = string
  }))
  default = {}
}

variable "allow_unauthenticated" {
  description = "Grant allUsers the run.invoker role (public web)."
  type        = bool
  default     = false
}
