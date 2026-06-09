variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for the Memorystore instance."
  type        = string
}

variable "instance_name" {
  description = "Name of the Memorystore Redis instance."
  type        = string
  default     = "glassbox-redis"
}

variable "network_id" {
  description = "Self-link / ID of the authorized VPC network."
  type        = string
}

variable "memory_size_gb" {
  description = "Redis instance capacity in GB."
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis engine version."
  type        = string
  default     = "REDIS_7_2"
}
