export { GlassBoxTracker } from "./tracker";
export type { TrackerConfig, TrackerEvent } from "./types";

// Auto-initialization from <script> tag:
// <script src="https://your-app.com/tracker.js" data-project="gb_live_xxx"></script>
import { GlassBoxTracker } from "./tracker";

if (typeof document !== "undefined") {
  const script = document.currentScript as HTMLScriptElement | null;
  const apiKey =
    script?.getAttribute("data-project") ??
    script?.getAttribute("data-api-key");

  if (apiKey) {
    const tracker = GlassBoxTracker.init({ apiKey });
    (window as any).__glassbox = tracker;
  }
}
