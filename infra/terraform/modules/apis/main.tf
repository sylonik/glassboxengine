###############################################################################
# Module: apis
#
# Enables the set of Google Cloud APIs required by the GlassBox Engine stack.
# Every downstream module depends (implicitly, through the root composition)
# on these services being active.
###############################################################################

resource "google_project_service" "this" {
  for_each = toset(var.services)

  project = var.project_id
  service = each.value

  # Keep the APIs enabled even if Terraform stops managing them; never let a
  # destroy disable an API that other (possibly out-of-band) resources rely on.
  disable_on_destroy         = false
  disable_dependent_services = false
}
