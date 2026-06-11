"use client";

export function ThemeSwitcher() {
  return (
    <div className="theme-switcher">
      <div className="theme-trigger" title="Theme: Quartz">
        <div className="theme-preview-dot" />
        <span className="theme-trigger-label">Quartz</span>
      </div>

      <style>{`
        .theme-switcher { position: relative; }
        .theme-trigger {
          display: flex; align-items: center; gap: var(--space-2);
          padding: var(--space-1-5) var(--space-3);
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius);
          font-size: var(--text-xs); color: var(--color-text-secondary);
          font-family: var(--font-body);
        }
        .theme-trigger-label { font-weight: var(--font-medium); }
        .theme-preview-dot { width: 12px; height: 12px; border-radius: var(--radius-full); flex-shrink: 0; background: #1a1625; }
      `}</style>
    </div>
  );
}
