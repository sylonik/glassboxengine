output "network_id" {
  description = "Self-link / ID of the VPC network."
  value       = google_compute_network.this.id
}

output "network_name" {
  description = "Name of the VPC network."
  value       = google_compute_network.this.name
}

output "subnet_id" {
  description = "ID of the workload subnet."
  value       = google_compute_subnetwork.workload.id
}

output "vpc_connector_id" {
  description = "ID of the Serverless VPC Access connector (used by Cloud Run)."
  value       = google_vpc_access_connector.this.id
}

output "private_services_connection" {
  description = "The service-networking peering connection (depend on this before creating private-IP managed services)."
  value       = google_service_networking_connection.private_services.id
}
