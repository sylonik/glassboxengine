output "host" {
  description = "Private IP / host of the Redis instance."
  value       = google_redis_instance.this.host
}

output "port" {
  description = "Port the Redis instance listens on."
  value       = google_redis_instance.this.port
}

output "redis_url" {
  description = "Convenience redis:// URL built from host and port (no auth on BASIC tier without AUTH)."
  value       = "redis://${google_redis_instance.this.host}:${google_redis_instance.this.port}"
}

output "instance_id" {
  description = "Memorystore instance ID."
  value       = google_redis_instance.this.id
}
