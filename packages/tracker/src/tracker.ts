import type { TrackerConfig, TrackerEvent } from "./types";
import { SessionManager } from "./session";
import { getDeviceInfo } from "./device";
import { EventQueue } from "./queue";
import {
  startPageViewTracking,
  startClickTracking,
  parseUtmParams,
  stopAutoTracking,
} from "./auto";

const DEFAULT_CONFIG = {
  autoPageViews: true,
  autoClicks: false,
  flushInterval: 5000,
  flushSize: 10,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  respectDoNotTrack: true,
} as const;

export class GlassBoxTracker {
  private config: Required<TrackerConfig>;
  private session: SessionManager;
  private queue: EventQueue;
  private userId = "";
  private userTraits: Record<string, unknown> = {};
  private utm: { utmSource: string; utmMedium: string; utmCampaign: string };
  private device: ReturnType<typeof getDeviceInfo>;
  private destroyed = false;

  private constructor(config: TrackerConfig) {
    const endpoint =
      config.endpoint ??
      (typeof window !== "undefined" ? window.location.origin : "");

    this.config = {
      apiKey: config.apiKey,
      endpoint,
      autoPageViews: config.autoPageViews ?? DEFAULT_CONFIG.autoPageViews,
      autoClicks: config.autoClicks ?? DEFAULT_CONFIG.autoClicks,
      flushInterval: config.flushInterval ?? DEFAULT_CONFIG.flushInterval,
      flushSize: config.flushSize ?? DEFAULT_CONFIG.flushSize,
      sessionTimeout: config.sessionTimeout ?? DEFAULT_CONFIG.sessionTimeout,
      respectDoNotTrack:
        config.respectDoNotTrack ?? DEFAULT_CONFIG.respectDoNotTrack,
    };

    this.session = new SessionManager(this.config.sessionTimeout);
    this.queue = new EventQueue(
      this.config.endpoint,
      this.config.apiKey,
      this.config.flushSize,
      this.config.flushInterval
    );
    this.utm = parseUtmParams();
    this.device = getDeviceInfo();

    // Check Do Not Track
    if (this.config.respectDoNotTrack && this.isDoNotTrack()) {
      this.destroyed = true;
      return;
    }

    // Auto page view tracking
    if (this.config.autoPageViews) {
      // Track initial page view
      this.pageView();

      startPageViewTracking((url, path, title) => {
        this.pageView(url, title);
      });
    }

    // Auto click tracking
    if (this.config.autoClicks) {
      startClickTracking((element, text, href) => {
        this.track("click", {
          elementText: text,
          elementHref: href,
          elementTag: element.tagName.toLowerCase(),
          elementId: element.id || undefined,
          elementClasses: element.className || undefined,
        });
      });
    }
  }

  /**
   * Initialize the tracker. This is the main entry point.
   */
  static init(config: TrackerConfig): GlassBoxTracker {
    return new GlassBoxTracker(config);
  }

  /**
   * Track a custom event.
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (this.destroyed) return;
    this.session.touch();

    const event = this.buildEvent(eventName, properties);
    this.queue.push(event);
  }

  /**
   * Identify a user. Enriches all subsequent events with the user ID.
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (this.destroyed) return;
    this.userId = userId;
    if (traits) {
      this.userTraits = { ...this.userTraits, ...traits };
    }

    // Track identify event
    this.track("identify", { ...this.userTraits });
  }

  /**
   * Manually track a page view.
   */
  pageView(url?: string, title?: string): void {
    if (this.destroyed) return;

    const pageUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
    const pageTitle = title ?? (typeof document !== "undefined" ? document.title : "");
    const pagePath =
      typeof window !== "undefined" ? new URL(pageUrl, window.location.origin).pathname : "";

    const event = this.buildEvent("page_view", {});
    event.pageUrl = pageUrl;
    event.pagePath = pagePath;
    event.pageTitle = pageTitle;
    event.referrer =
      typeof document !== "undefined" ? document.referrer : "";

    this.queue.push(event);
  }

  /**
   * Flush all pending events immediately.
   */
  async flush(): Promise<void> {
    await this.queue.flush();
  }

  /**
   * Tear down the tracker: stop listeners, flush remaining events.
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    stopAutoTracking();
    await this.queue.flush();
    this.queue.destroy();
  }

  private buildEvent(
    eventName: string,
    properties?: Record<string, unknown>
  ): TrackerEvent {
    return {
      sessionId: this.session.sessionId,
      anonymousId: this.session.anonymousId,
      userId: this.userId,
      eventName,
      pageUrl:
        typeof window !== "undefined" ? window.location.href : "",
      pagePath:
        typeof window !== "undefined" ? window.location.pathname : "",
      pageTitle:
        typeof document !== "undefined" ? document.title : "",
      referrer:
        typeof document !== "undefined" ? document.referrer : "",
      utmSource: this.utm.utmSource,
      utmMedium: this.utm.utmMedium,
      utmCampaign: this.utm.utmCampaign,
      deviceType: this.device.deviceType,
      browser: this.device.browser,
      os: this.device.os,
      screenWidth: this.device.screenWidth,
      screenHeight: this.device.screenHeight,
      properties: properties ?? {},
      durationMs: 0,
      timestamp: new Date().toISOString(),
    };
  }

  private isDoNotTrack(): boolean {
    if (typeof navigator === "undefined") return false;
    return navigator.doNotTrack === "1" || (navigator as any).globalPrivacyControl === true;
  }
}
