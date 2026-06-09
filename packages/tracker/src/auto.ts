/**
 * Auto-tracking utilities for page views and clicks.
 */

type PageViewCallback = (url: string, path: string, title: string) => void;
type ClickCallback = (element: HTMLElement, text: string, href: string | null) => void;

let originalPushState: typeof history.pushState | null = null;
let originalReplaceState: typeof history.replaceState | null = null;
let popstateHandler: (() => void) | null = null;
let clickHandler: ((e: MouseEvent) => void) | null = null;

/**
 * Start auto-tracking page views by monkey-patching History API
 * and listening to popstate events.
 */
export function startPageViewTracking(callback: PageViewCallback): void {
  if (typeof window === "undefined" || typeof history === "undefined") return;

  const notify = () => {
    callback(
      window.location.href,
      window.location.pathname,
      document.title
    );
  };

  // Monkey-patch pushState
  originalPushState = history.pushState;
  history.pushState = function (...args) {
    originalPushState!.apply(this, args);
    notify();
  };

  // Monkey-patch replaceState
  originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    originalReplaceState!.apply(this, args);
    notify();
  };

  // Listen to popstate (back/forward)
  popstateHandler = notify;
  window.addEventListener("popstate", popstateHandler);
}

/**
 * Start auto-tracking clicks on elements with [data-track] or interactive elements.
 */
export function startClickTracking(callback: ClickCallback): void {
  if (typeof document === "undefined") return;

  clickHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Walk up to find the nearest trackable element
    const el =
      target.closest("[data-track]") ??
      target.closest("a") ??
      target.closest("button");

    if (!el) return;

    const text =
      el.getAttribute("data-track") ??
      el.textContent?.trim().slice(0, 100) ??
      "";
    const href = el instanceof HTMLAnchorElement ? el.href : null;

    callback(el as HTMLElement, text, href);
  };

  document.addEventListener("click", clickHandler, { capture: true });
}

/** Parse UTM parameters from the current URL */
export function parseUtmParams(): {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
} {
  if (typeof window === "undefined") {
    return { utmSource: "", utmMedium: "", utmCampaign: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? "",
    utmMedium: params.get("utm_medium") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
  };
}

/** Clean up all auto-tracking listeners */
export function stopAutoTracking(): void {
  if (originalPushState && typeof history !== "undefined") {
    history.pushState = originalPushState;
    originalPushState = null;
  }
  if (originalReplaceState && typeof history !== "undefined") {
    history.replaceState = originalReplaceState;
    originalReplaceState = null;
  }
  if (popstateHandler && typeof window !== "undefined") {
    window.removeEventListener("popstate", popstateHandler);
    popstateHandler = null;
  }
  if (clickHandler && typeof document !== "undefined") {
    document.removeEventListener("click", clickHandler, { capture: true } as EventListenerOptions);
    clickHandler = null;
  }
}
