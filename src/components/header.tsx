"use client";

import { Bell, Search, User } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

export function Header() {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded);
  const dataMode = useUIStore((state) => state.dataMode);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm transition-all duration-200",
        sidebarExpanded ? "left-48" : "left-12"
      )}
    >
      {/* Search */}
      <div className="relative flex items-center">
        <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tickers, reports, metrics..."
          className="h-8 w-64 rounded-md border border-input bg-input pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Data mode indicator */}
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            dataMode === "real"
              ? "bg-positive/15 text-positive"
              : "bg-primary/15 text-primary"
          )}
        >
          {dataMode === "real" ? "LIVE" : "SIM"}
        </span>

        {/* Notifications */}
        <button className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-primary-foreground">
            3
          </span>
        </button>

        {/* User avatar */}
        <button className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
          <User className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
