const SESSION_KEY = "__gb_sid";
const ANON_KEY = "__gb_aid";
const LAST_ACTIVITY_KEY = "__gb_la";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class SessionManager {
  private sessionTimeout: number;
  private _sessionId: string;
  private _anonymousId: string;

  constructor(sessionTimeout: number) {
    this.sessionTimeout = sessionTimeout;
    this._anonymousId = this.loadOrCreateAnonymousId();
    this._sessionId = this.loadOrCreateSessionId();
  }

  get sessionId(): string {
    this.refreshSession();
    return this._sessionId;
  }

  get anonymousId(): string {
    return this._anonymousId;
  }

  /** Record activity to keep the session alive */
  touch(): void {
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      // sessionStorage unavailable
    }
  }

  private refreshSession(): void {
    try {
      const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const elapsed = Date.now() - Number(lastActivity);
        if (elapsed > this.sessionTimeout) {
          // Session expired — start a new one
          this._sessionId = generateId();
          sessionStorage.setItem(SESSION_KEY, this._sessionId);
        }
      }
      this.touch();
    } catch {
      // sessionStorage unavailable
    }
  }

  private loadOrCreateSessionId(): string {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        this.refreshSession();
        return existing;
      }
      const id = generateId();
      sessionStorage.setItem(SESSION_KEY, id);
      this.touch();
      return id;
    } catch {
      return generateId();
    }
  }

  private loadOrCreateAnonymousId(): string {
    try {
      const existing = localStorage.getItem(ANON_KEY);
      if (existing) return existing;
      const id = generateId();
      localStorage.setItem(ANON_KEY, id);
      return id;
    } catch {
      return generateId();
    }
  }
}
