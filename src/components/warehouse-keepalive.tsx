"use client";

import { useEffect } from "react";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — warehouse auto-stops at 10min idle

export function WarehouseKeepAlive() {
  useEffect(() => {
    // Warm up immediately on app load
    fetch("/api/health").catch(() => {});

    // Ping every 5 minutes to keep warehouse alive
    const id = setInterval(() => {
      fetch("/api/health").catch(() => {});
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  return null;
}
