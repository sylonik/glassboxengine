"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GlassBoxTracker } from "@glassbox/tracker";

/**
 * Module-level singleton so non-React code (e.g. the simulator) can grab the
 * tracker too. Kept in sync with React state for re-renders.
 */
let globalTracker: GlassBoxTracker | null = null;

export function getTracker(): GlassBoxTracker | null {
  return globalTracker;
}

interface TrackerContextValue {
  tracker: GlassBoxTracker | null;
  /** true once the /api/config fetch has resolved (success or graceful skip) */
  ready: boolean;
}

const TrackerContext = createContext<TrackerContextValue>({
  tracker: null,
  ready: false,
});

export function useTracker(): GlassBoxTracker | null {
  return useContext(TrackerContext).tracker;
}

export function useTrackerReady(): boolean {
  return useContext(TrackerContext).ready;
}

interface RuntimeConfig {
  apiKey: string;
  endpoint: string;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const [tracker, setTracker] = useState<GlassBoxTracker | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Guard against React 18/19 double-invoke in dev + remounts.
    if (initialized.current) return;
    initialized.current = true;

    let cancelled = false;

    (async () => {
      let config: RuntimeConfig = {
        apiKey: "",
        endpoint: "http://localhost:3000",
      };

      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (res.ok) {
          config = (await res.json()) as RuntimeConfig;
        }
      } catch (err) {
        console.warn("[GlassBox] Failed to load /api/config:", err);
      }

      if (cancelled) return;

      if (!config.apiKey) {
        console.warn(
          "[GlassBox] No API key configured (GLASSBOX_API_KEY). Tracking disabled."
        );
        setReady(true);
        return;
      }

      const instance = GlassBoxTracker.init({
        apiKey: config.apiKey,
        endpoint: config.endpoint || "http://localhost:3000",
        autoPageViews: true,
        autoClicks: false,
        flushInterval: 2000,
        flushSize: 3,
      });

      globalTracker = instance;
      setTracker(instance);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      globalTracker?.destroy();
      globalTracker = null;
    };
  }, []);

  return (
    <TrackerContext.Provider value={{ tracker, ready }}>
      {children}
    </TrackerContext.Provider>
  );
}
