"use client";

import { Database, Wifi } from "lucide-react";

interface ProvenanceBadgeProps {
  source: string;
}

export function ProvenanceBadge({ source }: ProvenanceBadgeProps) {
  const isLive = source.toLowerCase().includes("databricks");
  const isCached = source.toLowerCase().includes("cache");

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-md text-xs font-mono">
      {isLive ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-positive live-dot" />
          <Wifi size={11} className="text-positive" />
          <span className="font-semibold text-positive">LIVE</span>
        </span>
      ) : isCached ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-amber-500 font-semibold">CACHED</span>
        </span>
      ) : (
        <Database size={12} className="text-primary" />
      )}
      <span className="text-muted-foreground">{source}</span>
    </div>
  );
}
