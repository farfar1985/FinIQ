"use client";

import { useUIStore } from "@/stores/ui-store";
import { generateMarketData } from "@/data/simulated";
import { cn } from "@/lib/utils";

const marketTickers = generateMarketData();

export function TickerStrip() {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded);

  // Duplicate tickers for seamless scroll loop
  const tickers = [...marketTickers, ...marketTickers];

  return (
    <div
      className={cn(
        "fixed top-12 right-0 z-30 flex h-8 items-center overflow-hidden border-b border-border bg-background/90 backdrop-blur-sm transition-all duration-200",
        sidebarExpanded ? "left-48" : "left-12"
      )}
    >
      <div className="ticker-scroll flex items-center gap-6 whitespace-nowrap px-4">
        {tickers.map((ticker, idx) => (
          <div key={`${ticker.symbol}-${idx}`} className="flex items-center gap-1.5 text-xs">
            <span className="font-medium text-muted-foreground">
              {ticker.symbol}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {ticker.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums",
                ticker.changePercent >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {ticker.changePercent >= 0 ? "+" : ""}
              {ticker.changePercent.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .ticker-scroll {
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
