"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  Code2,
  Filter,
  Layers3,
  LayoutDashboard,
  LogOut,
  MousePointerClick,
  PanelLeftClose,
  PanelLeft,
  ScanEye,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { signOut } from "~/lib/auth_client";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Catalog", href: "/dashboard/catalog", icon: BookOpen },
  { label: "Alignment", href: "/dashboard/alignment", icon: SlidersHorizontal },
  { label: "Editor", href: "/dashboard/editor", icon: Code2 },
  { label: "Personas", href: "/dashboard/personas", icon: Users },
  { label: "Glass Box", href: "/dashboard/glass-box", icon: ScanEye },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Feedback", href: "/dashboard/feedback", icon: Activity },
  { label: "Tracking", href: "/dashboard/tracking", icon: MousePointerClick },
  { label: "Funnels", href: "/dashboard/funnels", icon: Filter },
  { label: "Deploy", href: "/dashboard/deploy", icon: Layers3 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onCommandOpen: () => void;
  projectSwitcher?: React.ReactNode;
  themeSwitcher?: React.ReactNode;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  onCommandOpen,
  projectSwitcher,
  themeSwitcher,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      if (result.error) return;
    } catch {
      return;
    }
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-overlay bg-black/60 md:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-modal flex flex-col border-r border-border bg-background transition-all duration-200 ease-out",
          // Desktop: always visible, width based on collapsed state
          "md:z-fixed",
          collapsed ? "md:w-[60px]" : "md:w-[240px]",
          // Mobile: full sidebar width, slide in/out
          "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center border-b border-border", collapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3")}>
          <Link href="/dashboard" className="flex items-center gap-2.5 text-foreground no-underline">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-subtle">
              <Box size={16} strokeWidth={2} className="text-primary" />
            </span>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight">GlassBox</span>
            )}
          </Link>
        </div>

        {/* Project Switcher */}
        {!collapsed && projectSwitcher && (
          <div className="border-b border-border px-3 py-2">
            {projectSwitcher}
          </div>
        )}

        {/* Search trigger */}
        {!collapsed && (
          <button
            onClick={onCommandOpen}
            className="mx-3 mt-3 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border-hover hover:text-foreground"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        )}
        {collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onCommandOpen}
                className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <Search size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Search (⌘K)</TooltipContent>
          </Tooltip>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Dashboard">
          {!collapsed && (
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
              Engine
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium no-underline transition-all duration-fast",
                    collapsed && "justify-center px-0 py-2",
                    isActive
                      ? "bg-primary-subtle text-foreground"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return link;
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-2 py-3">
          {themeSwitcher && !collapsed && (
            <div className="mb-2 px-2">{themeSwitcher}</div>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-subtle hover:text-destructive"
                >
                  <LogOut size={16} strokeWidth={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive-subtle hover:text-destructive"
            >
              <LogOut size={18} strokeWidth={1.8} />
              <span>Sign out</span>
            </button>
          )}

          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            className={cn(
              "mt-2 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
