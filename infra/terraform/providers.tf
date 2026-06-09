###############################################################################
# Providers
#
# Credentials are resolved via Application Default Credentials (ADC) at apply
# time:
#   gcloud auth application-default login
# No credentials are required for `terraform validate` / `init -backend=false`.
###############################################################################

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
