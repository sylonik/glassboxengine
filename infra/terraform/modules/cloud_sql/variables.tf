variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for the Cloud SQL instance."
  type        = string
}

variable "instance_name" {
  description = "Name of the Cloud SQL instance."
  type        = string
  default     = "glassbox-pg"
}

variable "network_id" {
  description = "Self-link / ID of the VPC the instance attaches its private IP to."
  type        = string
}

variable "database_name" {
  description = "Application database name."
  type        = string
  default     = "glassbox"
}

variable "db_user" {
  description = "Application database user name."
  type        = string
  default     = "glassbox"
}

variable "db_password" {
  description = "Password for the application database user. Supply out-of-band (do not commit)."
  type        = string
  sensitive   = true
}

variable "tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-custom-2-7680"
}

variable "availability_type" {
  description = "ZONAL or REGIONAL (REGIONAL = HA, recommended for production)."
  type        = string
  default     = "ZONAL"

  validation {
    condition     = contains(["ZONAL", "REGIONAL"], var.availability_type)
    error_message = "availability_type must be either ZONAL or REGIONAL."
  }
}

variable "disk_size_gb" {
  description = "Initial disk size in GB (autoresize is enabled)."
  type        = number
  default     = 20
}

variable "max_connections" {
  description = "Postgres max_connections database flag."
  type        = number
  default     = 100
}

variable "deletion_protection" {
  description = "Protect the instance from deletion. Keep true in production."
  type        = bool
  default     = true
}
