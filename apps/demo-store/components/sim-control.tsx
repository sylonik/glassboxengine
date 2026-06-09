"use client";

import { useCallback, useRef, useState } from "react";
import { useTracker } from "./tracker-provider";
import { useShopper } from "../lib/shopper-context";
import {
  runAllSimulations,
  runSimulation,
  type SimProgress,
} from "../lib/simulator";

export function SimControl() {
  const tracker = useTracker();
  const { shopper } = useShopper();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SimProgress | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onProgress = useCallback((p: SimProgress) => {
    setProgress(p);
  }, []);

  const finish = useCallback(() => {
    setRunning(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setProgress(null), 2400);
  }, []);

  const simulateOne = useCallback(async () => {
    if (!tracker || running) return;
    setRunning(true);
    setProgress({ shopper: shopper.short, step: "Starting…", fraction: 0 });
    try {
      await runSimulation(tracker, shopper.id, onProgress);
    } catch (err) {
      console.warn("[GlassBox] simulation failed:", err);
    } finally {
      finish();
    }
  }, [tracker, running, shopper, onProgress, finish]);

  const simulateAll = useCallback(async () => {
    if (!tracker || running) return;
    setRunning(true);
    setProgress({ shopper: "all shoppers", step: "Starting…", fraction: 0 });
    try {
      await runAllSimulations(tracker, onProgress);
    } catch (err) {
      console.warn("[GlassBox] simulation failed:", err);
    } finally {
      finish();
    }
  }, [tracker, running, onProgress, finish]);

  const disabled = !tracker || running;

  return (
    <div className="sim-panel">
      <button
        className="btn btn-primary btn-sm"
        onClick={simulateOne}
        disabled={disabled}
        title={
          tracker
            ? "Run a scripted session for the selected shopper"
            : "Tracking disabled — set GLASSBOX_API_KEY to enable"
        }
      >
        {running ? "Simulating…" : "▶ Simulate session"}
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={simulateAll}
        disabled={disabled}
        title="Run a session for every shopper to fill the dashboard"
      >
        All shoppers
      </button>

      {progress && (
        <div className="sim-progress" role="status" aria-live="polite">
          <div className="sim-progress-head">
            <span className="sim-progress-title">
              Simulating {progress.shopper}
            </span>
            <span className="tag">{Math.round(progress.fraction * 100)}%</span>
          </div>
          <div className="sim-progress-step">{progress.step}</div>
          <div className="sim-bar">
            <div
              className="sim-bar-fill"
              style={{ width: `${Math.round(progress.fraction * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
