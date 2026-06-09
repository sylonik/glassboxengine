terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = ">= 6.0, < 7.0"
    }
  }

  # ---------------------------------------------------------------------------
  # Remote state backend (GCS). Commented out so `terraform init -backend=false`
  # works without credentials. Enable for real deployments and run:
  #   terraform init -backend-config="bucket=<your-tf-state-bucket>"
  # ---------------------------------------------------------------------------
  # backend "gcs" {
  #   bucket = "glassbox-tf-state"
  #   prefix = "glassbox-engine/infra"
  # }
}
