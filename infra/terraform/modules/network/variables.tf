variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "Region for the subnet and the Serverless VPC Access connector."
  type        = string
}

variable "name_prefix" {
  description = "Prefix applied to all network resource names."
  type        = string
}

variable "subnet_cidr" {
  description = "Primary CIDR range for the workload subnet."
  type        = string
  default     = "10.10.0.0/20"
}

variable "psa_prefix_length" {
  description = "Prefix length for the Private Services Access reserved range (e.g. 16 -> a /16)."
  type        = number
  default     = 16
}

variable "connector_cidr" {
  description = "The /28 CIDR used by the Serverless VPC Access connector. Must not overlap the subnet or PSA range."
  type        = string
  default     = "10.8.0.0/28"
}

variable "connector_min_instances" {
  description = "Minimum number of connector instances."
  type        = number
  default     = 2
}

variable "connector_max_instances" {
  description = "Maximum number of connector instances."
  type        = number
  default     = 3
}

variable "connector_machine_type" {
  description = "Machine type for the Serverless VPC Access connector instances."
  type        = string
  default     = "e2-micro"
}
