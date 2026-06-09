###############################################################################
# Module: secrets
#
# Creates the Secret Manager *secret containers* for the application. Secret
# VALUES are supplied out-of-band (see README "Setting secret values") and are
# intentionally NOT managed by Terraform, so plaintext never lands in state.
#
# Each Cloud Run service references these by name as secret env vars.
###############################################################################

resource "google_secret_manager_secret" "this" {
  for_each = toset(var.secret_ids)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  labels = var.labels
}
