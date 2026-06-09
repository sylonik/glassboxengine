###############################################################################
# Module: cloud_run_service
#
# Reusable Cloud Run v2 service. Drives both:
#   * glassbox-web     (public ingress, port 3000)
#   * glassbox-workers (internal ingress, min instances 1, no inbound traffic)
#
# Wires up:
#   * VPC egress through the Serverless VPC Access connector (to reach private
#     Cloud SQL + Memorystore).
#   * Cloud SQL connection (mounts the instance via the built-in volume so the
#     in-container Cloud SQL Auth Proxy socket is available at
#     /cloudsql/<connection_name>).
#   * Plain env vars + secret env refs from Secret Manager.
###############################################################################

resource "google_cloud_run_v2_service" "this" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = var.ingress

  template {
    service_account = var.service_account_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    # Route egress into the VPC so private Cloud SQL / Redis IPs are reachable.
    # Services with no private dependencies (e.g. the demo storefront, which only
    # needs public outbound HTTPS) set vpc_connector_id = null and skip this block.
    dynamic "vpc_access" {
      for_each = var.vpc_connector_id == null ? [] : [1]
      content {
        connector = var.vpc_connector_id
        egress    = var.vpc_egress
      }
    }

    # Attach Cloud SQL instances (enables the /cloudsql unix socket).
    dynamic "volumes" {
      for_each = length(var.cloudsql_connection_names) > 0 ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = var.cloudsql_connection_names
        }
      }
    }

    containers {
      image = var.image

      # Only web exposes a port; workers run headless and take no inbound traffic.
      dynamic "ports" {
        for_each = var.container_port == null ? [] : [var.container_port]
        content {
          container_port = ports.value
        }
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        # Workers (min_instances >= 1) need CPU always allocated so background
        # jobs run outside request scope; web can throttle CPU between requests.
        cpu_idle          = var.cpu_always_allocated ? false : true
        startup_cpu_boost = true
      }

      # Plain (non-secret) environment variables.
      dynamic "env" {
        for_each = var.env
        content {
          name  = env.key
          value = env.value
        }
      }

      # Secret-backed environment variables (Secret Manager refs).
      dynamic "env" {
        for_each = var.secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_id
              version = env.value.version
            }
          }
        }
      }

      dynamic "volume_mounts" {
        for_each = length(var.cloudsql_connection_names) > 0 ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      # Liveness/startup probe only for services that expose a port (web).
      dynamic "startup_probe" {
        for_each = var.container_port == null ? [] : [var.container_port]
        content {
          tcp_socket {
            port = startup_probe.value
          }
          initial_delay_seconds = 10
          timeout_seconds       = 5
          period_seconds        = 10
          failure_threshold     = 6
        }
      }
    }

    max_instance_request_concurrency = var.max_concurrency
    timeout                          = var.request_timeout
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # The container image is owned by the CI/CD pipeline (it deploys SHA-tagged
  # images on every push to main). Ignore image drift here so `terraform apply`
  # manages infra/config without reverting the latest CI-deployed revision.
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
  }
}

# --- Public access (web only) -----------------------------------------------
# Allow unauthenticated invocations when var.allow_unauthenticated is true.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
