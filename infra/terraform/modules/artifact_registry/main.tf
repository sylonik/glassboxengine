###############################################################################
# Module: artifact_registry
#
# A single Docker-format Artifact Registry repository that holds both the web
# (Next.js standalone) image and the workers (event-pipeline) image. They are
# distinguished by image name within the repo, e.g.:
#
#   <region>-docker.pkg.dev/<project>/<repo>/glassbox-web:<tag>
#   <region>-docker.pkg.dev/<project>/<repo>/glassbox-workers:<tag>
###############################################################################

resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_id
  description   = "Docker images for GlassBox Engine (web + workers)."
  format        = "DOCKER"

  docker_config {
    immutable_tags = false
  }
}
