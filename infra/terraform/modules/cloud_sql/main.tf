###############################################################################
# Module: cloud_sql
#
# A PostgreSQL 16 Cloud SQL instance with a PRIVATE IP attached to the workload
# VPC, plus the `glassbox` database and an application user.
#
# ---------------------------------------------------------------------------
# pgvector NOTE (IMPORTANT — see README "pgvector enablement"):
#   Cloud SQL for PostgreSQL 16 ships the `vector` (pgvector) extension, but it
#   is NOT enabled automatically. After the instance + database exist you must
#   run, once, against the `glassbox` database:
#
#       CREATE EXTENSION IF NOT EXISTS vector;
#
#   This requires a live DB connection (psql via the Cloud SQL Auth Proxy or
#   `gcloud sql connect`) and therefore cannot run during `terraform validate`.
#   A commented `null_resource` placeholder is provided below; enable it only
#   in an environment that has DB connectivity, or run the SQL manually.
#
#   The `cloudsql.enable_pgvector` flag does NOT exist for Postgres — pgvector
#   on Cloud SQL is purely a `CREATE EXTENSION` operation. (Some other
#   extensions are gated behind `cloudsql.enable_*` flags; vector is not.)
# ---------------------------------------------------------------------------
###############################################################################

resource "google_sql_database_instance" "this" {
  project          = var.project_id
  name             = var.instance_name
  region           = var.region
  database_version = "POSTGRES_16"

  # Guard rail: keep this true in production so a stray `terraform destroy`
  # cannot wipe the primary database. Set to false intentionally to tear down.
  deletion_protection = var.deletion_protection

  settings {
    # ENTERPRISE edition accepts shared-core and db-custom-* tiers. The newer
    # default (ENTERPRISE_PLUS) only accepts db-perf-optimized-* tiers, which
    # rejects db-custom-* with a 400.
    edition           = "ENTERPRISE"
    tier              = var.tier
    availability_type = var.availability_type
    disk_size         = var.disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    ip_configuration {
      # Private IP only — no public IP. Clients reach it over the VPC via the
      # Serverless VPC Access connector or the Cloud SQL Auth Proxy.
      ipv4_enabled    = false
      private_network = var.network_id
      ssl_mode        = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    database_flags {
      name  = "max_connections"
      value = tostring(var.max_connections)
    }

    insights_config {
      query_insights_enabled = true
    }
  }
}

resource "google_sql_database" "glassbox" {
  project   = var.project_id
  name      = var.database_name
  instance  = google_sql_database_instance.this.name
  charset   = "UTF8"
  collation = "en_US.UTF8"
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = var.db_user
  instance = google_sql_database_instance.this.name
  password = var.db_password
}

# ---------------------------------------------------------------------------
# pgvector enablement placeholder (MANUAL / out-of-scope for validate).
#
# Uncomment and run ONLY from an environment with network access to the private
# Cloud SQL IP (e.g. via the Cloud SQL Auth Proxy started on 127.0.0.1:5432).
# Left commented so `terraform validate` / `plan` never attempts a live
# connection and so no credentials are required.
# ---------------------------------------------------------------------------
# resource "null_resource" "enable_pgvector" {
#   depends_on = [google_sql_database.glassbox, google_sql_user.app]
#
#   triggers = {
#     instance = google_sql_database_instance.this.name
#     database = google_sql_database.glassbox.name
#   }
#
#   provisioner "local-exec" {
#     # Requires: cloud-sql-proxy running locally + psql installed.
#     #   cloud-sql-proxy <connection_name> &
#     command = <<-EOT
#       PGPASSWORD='${var.db_password}' psql \
#         "host=127.0.0.1 port=5432 dbname=${var.database_name} user=${var.db_user}" \
#         -c "CREATE EXTENSION IF NOT EXISTS vector;"
#     EOT
#   }
# }
