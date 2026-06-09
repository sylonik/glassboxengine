"use client";

import { useState, useEffect, useRef } from "react";

const THEMES = [
  { id: "quartz", label: "Quartz", group: "Dark", preview: "#1a1625" },
  { id: "circuit", label: "Circuit", group: "Dark", preview: "#000000" },
  { id: "velvet", label: "Velvet", group: "Dark", preview: "#0f0f0f" },
  { id: "neon-agent", label: "Neon Agent", group: "Dark", preview: "#050505" },
  { id: "horizon", label: "Horizon", group: "Light", preview: "#f6f9fc" },
  { id: "amber", label: "Amber", group: "Light", preview: "#fffbf2" },
  { id: "slate", label: "Slate", group: "Light", preview: "#f8fafc" },
  { id: "flow", label: "Flow", group: "Light", preview: "#ffffff" },
  { id: "terrace", label: "Terrace", group: "Light", preview: "#faf9f6" },
  { id: "stitch", label: "Stitch", group: "Light", preview: "#ffffff" },
];

function readStoredTheme() {
  if (typeof window === "undefined") return "quartz";
  return localStorage.getItem("glassbox-theme") ?? "quartz";
}

export function ThemeSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  // Lazy initializer reads the persisted theme once on the client instead of
  // setting state inside an effect (react-hooks/set-state-in-effect).
  const [current, setCurrent] = useState(readStoredTheme);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", current);
  }, [current]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setTheme = (themeId: string) => {
    setCurrent(themeId);
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("glassbox-theme", themeId);
    setIsOpen(false);
  };

  const currentTheme = THEMES.find((t) => t.id === current);
  const darkThemes = THEMES.filter((t) => t.group === "Dark");
  const lightThemes = THEMES.filter((t) => t.group === "Light");

  return (
    <div className="theme-switcher" ref={ref}>
      <button
        className="theme-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch theme"
      >
        <div className="theme-preview-dot" style={{ background: currentTheme?.preview }} />
        <span className="theme-trigger-label">{currentTheme?.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="theme-dropdown animate-fade-in">
          <div className="theme-group-label">Dark</div>
          {darkThemes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${current === theme.id ? "theme-option-active" : ""}`}
              onClick={() => setTheme(theme.id)}
            >
              <div className="theme-preview-dot" style={{ background: theme.preview, border: theme.preview === "#000000" ? "1px solid var(--color-border)" : "none" }} />
              <span>{theme.label}</span>
              {current === theme.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" style={{ marginLeft: "auto" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
          <div className="theme-group-label" style={{ marginTop: "var(--space-2)" }}>Light</div>
          {lightThemes.map((theme) => (
            <button
              key={theme.id}
              className={`theme-option ${current === theme.id ? "theme-option-active" : ""}`}
              onClick={() => setTheme(theme.id)}
            >
              <div className="theme-preview-dot" style={{ background: theme.preview, border: "1px solid var(--color-border)" }} />
              <span>{theme.label}</span>
              {current === theme.id && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" style={{ marginLeft: "auto" }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .theme-switcher { position: relative; }
        .theme-trigger {
          display: flex; align-items: center; gap: var(--space-2);
          padding: var(--space-1-5) var(--space-3);
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius); cursor: pointer;
          font-size: var(--text-xs); color: var(--color-text-secondary);
          font-family: var(--font-body); transition: all var(--transition-fast);
        }
        .theme-trigger:hover { border-color: var(--color-accent); color: var(--color-text); }
        .theme-trigger-label { font-weight: var(--font-medium); }
        .theme-preview-dot { width: 12px; height: 12px; border-radius: var(--radius-full); flex-shrink: 0; }

        .theme-dropdown {
          position: absolute; bottom: 100%; left: 0; margin-bottom: var(--space-2);
          width: 200px; padding: var(--space-2);
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); box-shadow: var(--shadow-lg);
          z-index: var(--z-popover);
        }
        .theme-group-label {
          font-size: 10px; font-weight: var(--font-bold); color: var(--color-text-muted);
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: var(--space-1) var(--space-2);
        }
        .theme-option {
          display: flex; align-items: center; gap: var(--space-2-5);
          min-height: 34px; width: 100%; padding: var(--space-2) var(--space-2-5);
          background: none; border: none; border-radius: var(--radius-sm);
          cursor: pointer; font-size: var(--text-xs); color: var(--color-text-secondary);
          font-family: var(--font-body); transition: all var(--transition-fast);
        }
        .theme-option:hover { background: var(--color-surface-hover); color: var(--color-text); }
        .theme-option-active { background: var(--color-accent-subtle); color: var(--color-text); font-weight: var(--font-medium); }
      `}</style>
    </div>
  );
}
