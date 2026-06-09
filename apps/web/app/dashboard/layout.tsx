"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "~/components/layout/sidebar";
import { CommandPalette } from "~/components/layout/command-palette";
import { ThemeSwitcher } from "~/components/theme_switcher";
import { cn } from "~/lib/utils";
import {
  ProjectProvider,
  ProjectSwitcher,
  SetupGuide,
} from "./project_context";

const SIDEBAR_KEY = "glassbox-sidebar-collapsed";

/**
 * External store that owns the persisted "sidebar collapsed" flag. Using
 * useSyncExternalStore (instead of reading localStorage inside an effect and
 * calling setState) keeps the value the single source of truth and avoids the
 * react-hooks/set-state-in-effect cascading-render warning while preserving
 * persistence across reloads and cross-tab sync.
 */
const sidebarStore = (() => {
  const listeners = new Set<() => void>();
  const read = () =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(SIDEBAR_KEY) === "true";
  let snapshot = false;
  return {
    subscribe(callback: () => void) {
      listeners.add(callback);
      const onStorage = (e: StorageEvent) => {
        if (e.key === SIDEBAR_KEY) {
          snapshot = read();
          callback();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(callback);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      // Cache so repeated calls return a referentially stable boolean.
      snapshot = read();
      return snapshot;
    },
    getServerSnapshot() {
      return false;
    },
    set(next: boolean) {
      localStorage.setItem(SIDEBAR_KEY, String(next));
      snapshot = next;
      listeners.forEach((l) => l());
    },
  };
})();

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    sidebarStore.set(!sidebarStore.getSnapshot());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <ProjectProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onCommandOpen={() => setCommandOpen(true)}
          projectSwitcher={<ProjectSwitcher />}
          themeSwitcher={<ThemeSwitcher />}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        {/* Main content area */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-200 ease-out",
            // Mobile: full width (sidebar overlays)
            "ml-0",
            // Desktop: offset by sidebar width
            collapsed ? "md:ml-[60px]" : "md:ml-[240px]"
          )}
        >
          {/* Mobile header bar */}
          <div className="sticky top-0 z-sticky flex items-center gap-3 border-b border-border bg-background px-4 py-3 md:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <span className="text-sm font-semibold text-foreground">GlassBox</span>
          </div>

          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
            <SetupGuide />
            {children}
          </div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </ProjectProvider>
  );
}
