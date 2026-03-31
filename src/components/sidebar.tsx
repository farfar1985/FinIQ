"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Target,
  MessageSquare,
  ListTodo,
  Database,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Financial Reports", icon: FileText, href: "/reports" },
  { label: "Competitive Intel", icon: Target, href: "/competitive" },
  { label: "Query Interface", icon: MessageSquare, href: "/query" },
  { label: "Job Board", icon: ListTodo, href: "/jobs" },
  { label: "Data Explorer", icon: Database, href: "/explorer" },
  { label: "Admin", icon: Settings, href: "/admin" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarExpanded, toggleSidebar, theme, toggleTheme } = useUIStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarExpanded ? "w-48" : "w-12"
      )}
    >
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-sidebar-border px-2.5">
        {sidebarExpanded ? (
          <span className="text-sm font-bold tracking-tight text-sidebar-primary">
            Amira FinIQ
          </span>
        ) : (
          <span className="mx-auto text-xs font-bold text-sidebar-primary">
            FIQ
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-1.5 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-sidebar-accent",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sidebarExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="space-y-0.5 border-t border-sidebar-border px-1.5 py-2">
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {sidebarExpanded && (
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          )}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          {sidebarExpanded ? (
            <PanelLeftClose className="h-4 w-4 shrink-0" />
          ) : (
            <PanelLeft className="h-4 w-4 shrink-0" />
          )}
          {sidebarExpanded && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
