"use client";

import { useUIStore } from "@/stores/ui-store";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { TickerStrip } from "@/components/ticker-strip";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <Header />
      <TickerStrip />
      <main
        className={cn(
          "pt-20 transition-all duration-200",
          sidebarExpanded ? "pl-48" : "pl-12"
        )}
      >
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
