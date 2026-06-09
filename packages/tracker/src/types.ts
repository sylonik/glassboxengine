export interface TrackerConfig {
  /** API key (gb_live_...) — required */
  apiKey: string;
  /** GlassBox server endpoint. Defaults to the origin that served the script. */
  endpoint?: string;
  /** Automatically track page views on navigation. Default: true */
  autoPageViews?: boolean;
  /** Automatically track clicks on elements with [data-track] attribute. Default: false */
  autoClicks?: boolean;
  /** Milliseconds between batch flushes. Default: 5000 */
  flushInterval?: number;
  /** Number of events to accumulate before flushing. Default: 10 */
  flushSize?: number;
  /** Milliseconds of inactivity before starting a new session. Default: 1800000 (30 min) */
  sessionTimeout?: number;
  /** Respect the browser's Do Not Track setting. Default: true */
  respectDoNotTrack?: boolean;
}

export interface TrackerEvent {
  sessionId: string;
  anonymousId: string;
  userId: string;
  eventName: string;
  pageUrl: string;
  pagePath: string;
  pageTitle: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  deviceType: string;
  browser: string;
  os: string;
  screenWidth: number;
  screenHeight: number;
  properties: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}
