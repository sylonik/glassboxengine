"use client";

import { useEffect, useRef } from "react";
import { GlassBoxTracker } from "@glassbox/tracker";

let globalTracker: GlassBoxTracker | null = null;

export function useTracker(): GlassBoxTracker | null {
  return globalTracker;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const apiKey = process.env.NEXT_PUBLIC_GLASSBOX_API_KEY;
    const endpoint =
      process.env.NEXT_PUBLIC_GLASSBOX_ENDPOINT ?? "http://localhost:3000";

    if (!apiKey) {
      console.warn(
        "[GlassBox] NEXT_PUBLIC_GLASSBOX_API_KEY is not set. Tracking disabled."
      );
      return;
    }

    globalTracker = GlassBoxTracker.init({
      apiKey,
      endpoint,
      autoPageViews: true,
      autoClicks: false,
      flushInterval: 3000,
      flushSize: 5,
    });

    return () => {
      globalTracker?.destroy();
      globalTracker = null;
    };
  }, []);

  return <>{children}</>;
}
