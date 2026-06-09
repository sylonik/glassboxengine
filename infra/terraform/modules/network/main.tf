###############################################################################
# Module: network
#
# Provisions a custom-mode VPC plus everything Cloud Run needs to reach private
# backends:
#
#   * A custom VPC + subnet for the workload region.
#   * Private Services Access (PSA): a reserved /16 + a service-networking
#     peering connection so Cloud SQL / Memorystore can be created with private
#     IPs inside this VPC.
#   * A Serverless VPC Access connector that lets Cloud Run v2 services route
#     egress into the VPC (and therefore to the private Cloud SQL / Redis IPs).
###############################################################################

# --- VPC ---------------------------------------------------------------------
resource "google_compute_network" "this" {
  project                 = var.project_id
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# --- Workload subnet ---------------------------------------------------------
resource "google_compute_subnetwork" "workload" {
  project                  = var.project_id
  name                     = "${var.name_prefix}-subnet"
  region                   = var.region
  network                  = google_compute_network.this.id
  ip_cidr_range            = var.subnet_cidr
  private_ip_google_access = true
}

# --- Private Services Access (for Cloud SQL / Memorystore private IPs) --------
# Reserve an address range that Google-managed services (Cloud SQL,
# Memorystore) carve their private IPs from.
resource "google_compute_global_address" "private_services" {
  project       = var.project_id
  name          = "${var.name_prefix}-psa-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.psa_prefix_length
  network       = google_compute_network.this.id
}

# Establish the VPC peering between this VPC and the service-networking VPC.
resource "google_service_networking_connection" "private_services" {
  network                 = google_compute_network.this.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_services.name]

  # Deleting the peering can fail if managed services still hold leases; let
  # Terraform abandon it on destroy rather than hang.
  deletion_policy = "ABANDON"
}

# --- Serverless VPC Access connector ----------------------------------------
# Cloud Run v2 routes VPC egress through this connector. The /28 must not
# overlap with the workload subnet or the PSA range.
resource "google_vpc_access_connector" "this" {
  project = var.project_id
  name    = "${var.name_prefix}-vpcconn"
  region  = var.region
  network = google_compute_network.this.name

  ip_cidr_range = var.connector_cidr

  min_instances = var.connector_min_instances
  max_instances = var.connector_max_instances
  machine_type  = var.connector_machine_type
}
