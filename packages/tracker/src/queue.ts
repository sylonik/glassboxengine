import type { TrackerEvent } from "./types";

export class EventQueue {
  private buffer: TrackerEvent[] = [];
  private endpoint: string;
  private apiKey: string;
  private flushSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(endpoint: string, apiKey: string, flushSize: number, flushInterval: number) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.flushSize = flushSize;
    this.flushInterval = flushInterval;
    this.startTimer();
    this.bindVisibility();
  }

  push(event: TrackerEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.flushSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = this.buffer.splice(0, 50); // max batch size
    const url = `${this.endpoint}/api/t`;
    const body = JSON.stringify({ events });
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    try {
      await fetch(url, { method: "POST", headers, body, keepalive: true });
    } catch {
      // Re-add events to buffer on failure for retry on next flush
      this.buffer.unshift(...events);
    }
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.visibilityHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private startTimer(): void {
    if (typeof setInterval === "undefined") return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushInterval);
  }

  private bindVisibility(): void {
    if (typeof document === "undefined") return;
    this.visibilityHandler = () => {
      if (document.visibilityState === "hidden") {
        this.beaconFlush();
      }
    };
    document.addEventListener("visibilitychange", this.visibilityHandler);
  }

  /** Use sendBeacon for reliable delivery on page unload */
  private beaconFlush(): void {
    if (this.buffer.length === 0) return;
    const events = this.buffer.splice(0, 50);
    const url = `${this.endpoint}/api/t`;
    const body = JSON.stringify({ events });

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      // sendBeacon doesn't support custom headers, so encode API key in URL
      const sent = navigator.sendBeacon(`${url}?key=${encodeURIComponent(this.apiKey)}`, blob);
      if (!sent) {
        // Fallback: put events back
        this.buffer.unshift(...events);
      }
    } else {
      // Fallback to fetch with keepalive
      void fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
        keepalive: true,
      }).catch(() => {
        this.buffer.unshift(...events);
      });
    }
  }
}
