"use client";

import { cn } from "@/lib/utils";

// Market ticker data — will be replaced with real FMP data in Batch 7
const tickerItems = [
  { symbol: "NSRGY", name: "Nestle", price: 98.42, change: 1.23 },
  { symbol: "MDLZ", name: "Mondelez", price: 72.15, change: -0.45 },
  { symbol: "HSY", name: "Hershey", price: 185.30, change: 2.10 },
  { symbol: "CL", name: "Colgate", price: 95.67, change: 0.34 },
  { symbol: "GIS", name: "Gen Mills", price: 64.89, change: -1.12 },
  { symbol: "K", name: "Kellanova", price: 58.22, change: 0.78 },
  { symbol: "SJM", name: "Smucker", price: 112.45, change: -0.67 },
  { symbol: "FRPT", name: "Freshpet", price: 134.90, change: 3.45 },
  { symbol: "IDXX", name: "IDEXX", price: 478.33, change: -2.15 },
];

export function Ticker() {
  return (
    <div className="flex h-[var(--ticker-height)] items-center overflow-hidden border-b border-border bg-card/50 px-4">
      <div className="flex animate-ticker gap-6 whitespace-nowrap">
        {[...tickerItems, ...tickerItems].map((item, i) => (
          <div key={`${item.symbol}-${i}`} className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{item.symbol}</span>
            <span className="font-mono tabular-nums text-muted-foreground">
              ${item.price.toFixed(2)}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums",
                item.change >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {item.change >= 0 ? "+" : ""}
              {item.change.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
