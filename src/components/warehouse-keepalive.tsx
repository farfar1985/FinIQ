"use client";

import { useEffect, useState, ReactNode } from "react";

const KEEPALIVE_MS = 5 * 60 * 1000; // 5 minutes — warehouse auto-stops at 10min idle
const POLL_MS = 5_000; // Check every 5s while warming
const MAX_WAIT_MS = 120_000; // Give up after 2 minutes

/**
 * Wraps the app and blocks rendering until Databricks warehouse is confirmed running.
 * Shows a warm-up screen during cold start. Once warm, renders children and
 * pings every 5 minutes to prevent the warehouse from going idle.
 */
export function WarehouseGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Connecting to Databricks...");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    async function check(): Promise<boolean> {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        return data.warehouse === "running";
      } catch {
        return false;
      }
    }

    async function waitForWarehouse() {
      // First check — might already be running
      if (await check()) {
        if (!cancelled) setReady(true);
        return;
      }

      if (!cancelled) setStatus("Warehouse is starting up...");

      // Poll until running or timeout
      const interval = setInterval(async () => {
        if (cancelled) { clearInterval(interval); return; }

        const now = Date.now();
        const secs = Math.round((now - start) / 1000);
        setElapsed(secs);

        if (now - start > MAX_WAIT_MS) {
          clearInterval(interval);
          if (!cancelled) {
            setStatus("Warehouse is taking longer than usual. Loading app anyway...");
            setTimeout(() => { if (!cancelled) setReady(true); }, 2000);
          }
          return;
        }

        if (await check()) {
          clearInterval(interval);
          if (!cancelled) setReady(true);
        }
      }, POLL_MS);
    }

    waitForWarehouse();
    return () => { cancelled = true; };
  }, []);

  // Keep-alive ping once warehouse is warm
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      fetch("/api/health").catch(() => {});
    }, KEEPALIVE_MS);
    return () => clearInterval(id);
  }, [ready]);

  if (ready) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Amira FinIQ</h2>
          <p className="mt-1 text-sm text-muted-foreground">{status}</p>
          {elapsed > 0 && (
            <p className="mt-1 text-xs text-muted-foreground/60">{elapsed}s</p>
          )}
        </div>
      </div>
    </div>
  );
}
