###############################################################################
# Module: redis
#
# Memorystore for Redis (BASIC tier) used as the BullMQ broker by the
# event-pipeline workers. Connected to the workload VPC over Private Services
# Access so Cloud Run reaches it through the Serverless VPC Access connector.
###############################################################################

resource "google_redis_instance" "this" {
  project        = var.project_id
  name           = var.instance_name
  region         = var.region
  tier           = "BASIC"
  memory_size_gb = var.memory_size_gb

  # Private services access: instance gets an internal IP in the workload VPC.
  authorized_network      = var.network_id
  connect_mode            = "PRIVATE_SERVICE_ACCESS"
  transit_encryption_mode = "DISABLED"

  redis_version = var.redis_version
  display_name  = "GlassBox BullMQ broker"
}
