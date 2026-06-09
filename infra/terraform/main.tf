###############################################################################
# GlassBox Engine — root composition
#
# Wires the local modules together into the full GCP target:
#   apis -> network -> {cloud_sql, redis, artifact_registry, secrets, iam}
#        -> cloud_run_service (web + workers)
#
# Do NOT run `terraform apply` blindly: review the apply order in the README
# (APIs first, then network/PSA, then data services, then Cloud Run).
###############################################################################

locals {
  # The full set of secrets the app consumes (containers created by the
  # `secrets` module; values supplied out-of-band).
  secret_ids = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_API_KEY",
    "REDIS_URL",
    "CLICKHOUSE_URL",
    "CLICKHOUSE_DATABASE",
    "NEXT_PUBLIC_APP_URL",
    # Demo storefront's API key for calling the engine. Container only; value
    # supplied out-of-band (see docs/demo-deploy.md).
    "DEMO_GLASSBOX_API_KEY",
  ]

  # Secrets consumed by the web service (Next.js + tRPC API in-process).
  web_secret_ids = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_API_KEY",
    "REDIS_URL",
    "CLICKHOUSE_URL",
    "CLICKHOUSE_DATABASE",
    "NEXT_PUBLIC_APP_URL",
  ]

  # Secrets consumed by the workers (BullMQ + ClickHouse ingest + DB writes).
  workers_secret_ids = [
    "DATABASE_URL",
    "REDIS_URL",
    "CLICKHOUSE_URL",
    "CLICKHOUSE_DATABASE",
    "GOOGLE_API_KEY",
  ]

  # Secrets consumed by the demo storefront (only its engine API key).
  demo_secret_ids = [
    "DEMO_GLASSBOX_API_KEY",
  ]

  # Helper to build the secret_env map a Cloud Run service expects from a list
  # of secret IDs, always pulling the "latest" version.
  web_secret_env = {
    for id in local.web_secret_ids : id => {
      secret_id = module.secrets.secret_ids[id]
      version   = "latest"
    }
  }
  workers_secret_env = {
    for id in local.workers_secret_ids : id => {
      secret_id = module.secrets.secret_ids[id]
      version   = "latest"
    }
  }

  # The demo reads its engine credential from the env var GLASSBOX_API_KEY,
  # backed by the DEMO_GLASSBOX_API_KEY secret container.
  demo_secret_env = {
    GLASSBOX_API_KEY = {
      secret_id = module.secrets.secret_ids["DEMO_GLASSBOX_API_KEY"]
      version   = "latest"
    }
  }

  required_apis = [
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudtrace.googleapis.com",
    "aiplatform.googleapis.com",
    # Agent Engine's in-engine aiplatform SDK resolves project number->ID via
    # Cloud Resource Manager; without this, stream_query fails with
    # "Failed to create session" (403 SERVICE_DISABLED).
    "cloudresourcemanager.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
    # Required for Private Services Access (Cloud SQL/Redis private IPs).
    "servicenetworking.googleapis.com",
    # Required for Workload Identity Federation (keyless CI/CD).
    "iam.googleapis.com",
    "sts.googleapis.com",
    "iamcredentials.googleapis.com",
  ]

  registry_base = module.artifact_registry.repository_url

  web_image     = "${local.registry_base}/glassbox-web:${var.web_image_tag}"
  workers_image = "${local.registry_base}/glassbox-workers:${var.workers_image_tag}"
  demo_image    = "${local.registry_base}/glassbox-demo:${var.demo_image_tag}"
}

# --- APIs --------------------------------------------------------------------
module "apis" {
  source = "./modules/apis"

  project_id = var.project_id
  services   = local.required_apis
}

# --- Network (VPC, PSA, Serverless VPC connector) ----------------------------
module "network" {
  source = "./modules/network"

  project_id  = var.project_id
  region      = var.region
  name_prefix = var.name_prefix

  depends_on = [module.apis]
}

# --- Artifact Registry -------------------------------------------------------
module "artifact_registry" {
  source = "./modules/artifact_registry"

  project_id    = var.project_id
  region        = var.region
  repository_id = var.artifact_repository_id

  depends_on = [module.apis]
}

# --- Secret Manager (containers only) ----------------------------------------
module "secrets" {
  source = "./modules/secrets"

  project_id = var.project_id
  secret_ids = local.secret_ids
  labels     = { app = "glassbox" }

  depends_on = [module.apis]
}

# --- Cloud SQL (Postgres 16, private IP, pgvector via post-provision SQL) -----
module "cloud_sql" {
  source = "./modules/cloud_sql"

  project_id          = var.project_id
  region              = var.region
  network_id          = module.network.network_id
  db_user             = var.db_user
  db_password         = var.db_password
  tier                = var.cloudsql_tier
  availability_type   = var.cloudsql_availability_type
  deletion_protection = var.cloudsql_deletion_protection

  # PSA peering must exist before a private-IP instance can be created.
  depends_on = [module.network]
}

# --- Memorystore (Redis, BullMQ broker) --------------------------------------
module "redis" {
  source = "./modules/redis"

  project_id     = var.project_id
  region         = var.region
  network_id     = module.network.network_id
  memory_size_gb = var.redis_memory_size_gb

  depends_on = [module.network]
}

# --- IAM (service accounts + role grants) ------------------------------------
module "iam" {
  source = "./modules/iam"

  project_id         = var.project_id
  web_secret_ids     = local.web_secret_ids
  workers_secret_ids = local.workers_secret_ids
  demo_secret_ids    = local.demo_secret_ids

  # Secrets must exist before per-secret IAM bindings reference them.
  depends_on = [module.secrets, module.apis]
}

# --- Cloud Run: web (public) -------------------------------------------------
module "cloud_run_web" {
  source = "./modules/cloud_run_service"

  project_id            = var.project_id
  region                = var.region
  service_name          = "glassbox-web"
  image                 = local.web_image
  service_account_email = module.iam.web_sa_email

  ingress               = "INGRESS_TRAFFIC_ALL"
  allow_unauthenticated = true

  vpc_connector_id          = module.network.vpc_connector_id
  vpc_egress                = "PRIVATE_RANGES_ONLY"
  cloudsql_connection_names = [module.cloud_sql.connection_name]

  container_port       = 3000
  min_instances        = var.web_min_instances
  max_instances        = var.web_max_instances
  cpu                  = var.web_cpu
  memory               = var.web_memory
  cpu_always_allocated = false

  env = {
    NODE_ENV = "production"
    # PORT is reserved by Cloud Run (set automatically to the container port).
    OTEL_SERVICE_NAME           = var.otel_service_name
    OTEL_EXPORTER_OTLP_ENDPOINT = var.otel_exporter_otlp_endpoint
  }

  secret_env = local.web_secret_env

  depends_on = [module.iam, module.cloud_sql, module.redis]
}

# --- Cloud Run: demo storefront (public, no VPC/SQL) -------------------------
# A standalone Next.js demo that talks to the engine over public HTTPS only.
# No database, Redis, ClickHouse, or VPC — so vpc_connector_id /
# cloudsql_connection_names are omitted (they default to null / []).
module "cloud_run_demo" {
  source = "./modules/cloud_run_service"

  project_id            = var.project_id
  region                = var.region
  service_name          = "glassbox-demo"
  image                 = local.demo_image
  service_account_email = module.iam.demo_sa_email

  ingress               = "INGRESS_TRAFFIC_ALL"
  allow_unauthenticated = true

  # No VPC connector and no Cloud SQL: the demo only needs outbound HTTPS.

  container_port       = 3002
  min_instances        = 0
  max_instances        = 4
  cpu                  = "1"
  memory               = "512Mi"
  cpu_always_allocated = false

  env = {
    NODE_ENV          = "production"
    GLASSBOX_ENDPOINT = var.demo_glassbox_endpoint
  }

  # GLASSBOX_API_KEY comes from the DEMO_GLASSBOX_API_KEY secret container.
  secret_env = local.demo_secret_env

  depends_on = [module.iam, module.secrets]
}

# --- CI/CD (Workload Identity Federation for GitHub Actions) -----------------
module "cicd" {
  source = "./modules/cicd"

  project_id            = var.project_id
  github_repo           = var.github_repo
  web_runtime_sa_email  = module.iam.web_sa_email
  demo_runtime_sa_email = module.iam.demo_sa_email

  depends_on = [module.apis, module.iam]
}

# --- Cloud Run: workers (internal, min 1) ------------------------------------
module "cloud_run_workers" {
  source = "./modules/cloud_run_service"

  project_id            = var.project_id
  region                = var.region
  service_name          = "glassbox-workers"
  image                 = local.workers_image
  service_account_email = module.iam.workers_sa_email

  # No public ingress; workers consume from the BullMQ queue, not HTTP.
  ingress               = "INGRESS_TRAFFIC_INTERNAL_ONLY"
  allow_unauthenticated = false

  vpc_connector_id          = module.network.vpc_connector_id
  vpc_egress                = "PRIVATE_RANGES_ONLY"
  cloudsql_connection_names = [module.cloud_sql.connection_name]

  # Headless: no exposed port. min_instances >= 1 keeps a worker alive, and
  # cpu_always_allocated lets it process jobs outside of any request scope.
  container_port       = null
  min_instances        = var.workers_min_instances
  max_instances        = var.workers_max_instances
  cpu                  = var.workers_cpu
  memory               = var.workers_memory
  cpu_always_allocated = true

  env = {
    NODE_ENV                    = "production"
    OTEL_SERVICE_NAME           = "${var.otel_service_name}-workers"
    OTEL_EXPORTER_OTLP_ENDPOINT = var.otel_exporter_otlp_endpoint
  }

  secret_env = local.workers_secret_env

  depends_on = [module.iam, module.cloud_sql, module.redis]
}
