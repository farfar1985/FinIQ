"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Ticker } from "./ticker";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Ticker />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
