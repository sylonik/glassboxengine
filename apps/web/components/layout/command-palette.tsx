"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  Code2,
  Filter,
  Layers3,
  LayoutDashboard,
  MousePointerClick,
  Plus,
  ScanEye,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";

const pages = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Catalog", href: "/dashboard/catalog", icon: BookOpen },
  { label: "Alignment Studio", href: "/dashboard/alignment", icon: SlidersHorizontal },
  { label: "Scoring Editor", href: "/dashboard/editor", icon: Code2 },
  { label: "Persona Lab", href: "/dashboard/personas", icon: Users },
  { label: "Glass Box", href: "/dashboard/glass-box", icon: ScanEye },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Feedback", href: "/dashboard/feedback", icon: Activity },
  { label: "Tracking", href: "/dashboard/tracking", icon: MousePointerClick },
  { label: "Funnels", href: "/dashboard/funnels", icon: Filter },
  { label: "Deploy", href: "/dashboard/deploy", icon: Layers3 },
];

const actions = [
  { label: "Create Persona", href: "/dashboard/personas", icon: Plus },
  { label: "Run Alignment", href: "/dashboard/alignment", icon: SlidersHorizontal },
  { label: "Add Product", href: "/dashboard/catalog", icon: Plus },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const navigate = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.href}
                onSelect={() => navigate(page.href)}
                className="gap-2.5"
              >
                <Icon size={16} strokeWidth={1.8} className="text-muted-foreground" />
                <span>{page.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.label}
                onSelect={() => navigate(action.href)}
                className="gap-2.5"
              >
                <Icon size={16} strokeWidth={1.8} className="text-muted-foreground" />
                <span>{action.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
