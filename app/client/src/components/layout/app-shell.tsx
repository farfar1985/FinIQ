"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Ticker } from "./ticker";
import { useHistoryStore } from "@/stores/history-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  // FR8.11: Global Ctrl+Z / Ctrl+Shift+Z undo/redo shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl || e.key.toLowerCase() !== "z") return;
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Ticker />
        <main id="main-content" role="main" className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
