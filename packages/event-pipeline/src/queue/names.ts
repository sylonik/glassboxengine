/**
 * Canonical BullMQ queue names, shared by producers (API) and consumers (workers)
 * so the two can never drift.
 *
 * NOTE: BullMQ uses ':' as its internal Redis key separator and rejects queue
 * names that contain it ("Queue name cannot contain :"). Use '-' instead.
 */
export const QUEUE_NAMES = {
  feedback: "glassbox-feedback",
  recommendations: "glassbox-recommendations",
  websiteEvents: "glassbox-website-events",
} as const;
