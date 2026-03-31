"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { Wifi, Database } from "lucide-react";

// 10 FMP competitors matching SRS Section 7
const COMPETITOR_TICKERS = [
  { ticker: "NSRGY", name: "Nestle" },
  { ticker: "MDLZ", name: "Mondelez" },
  { ticker: "HSY", name: "Hershey" },
  { ticker: "CL", name: "Colgate-Palmolive" },
  { ticker: "SJM", name: "J.M. Smucker" },
  { ticker: "GIS", name: "General Mills" },
  { ticker: "PG", name: "P&G" },
  { ticker: "UL", name: "Unilever" },
  { ticker: "KHC", name: "Kraft Heinz" },
  { ticker: "K", name: "Kellanova" },
];

interface TickerData {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
}

function generateSimulatedTickers(): TickerData[] {
  return COMPETITOR_TICKERS.map((c) => {
    const basePrice = 50 + Math.random() * 150;
    const changePct = (Math.random() - 0.5) * 6;
    return {
      ticker: c.ticker,
      name: c.name,
      price: parseFloat(basePrice.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
    };
  });
}

export function TickerStrip() {
  const sidebarExpanded = useUIStore((state) => state.sidebarExpanded);
  const [tickers, setTickers] = useState<TickerData[]>(generateSimulatedTickers);
  const [isLive, setIsLive] = useState(false);

  // Fetch from FMP dashboard endpoint on mount, fall back to simulated
  useEffect(() => {
    let cancelled = false;
    async function fetchLive() {
      try {
        const res = await fetch("/api/fmp/dashboard");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.competitors && Array.isArray(json.competitors) && json.competitors.length > 0) {
          const liveData: TickerData[] = json.competitors.map((c: { ticker: string; name: string; price: number; changePct: number }) => ({
            ticker: c.ticker,
            name: c.name,
            price: c.price,
            changePct: c.changePct,
          }));
          setTickers(liveData);
          setIsLive(true);
        }
      } catch {
        // Keep simulated data
      }
    }
    fetchLive();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className={cn(
        "fixed top-12 right-0 z-30 flex h-8 items-center overflow-hidden border-b border-border bg-background/90 backdrop-blur-sm transition-all duration-200",
        sidebarExpanded ? "left-48" : "left-12"
      )}
    >
      <div className="flex items-center gap-4 whitespace-nowrap px-3 overflow-x-auto flex-1">
        {tickers.map((t) => (
          <div key={t.ticker} className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="font-semibold text-muted-foreground">
              {t.ticker}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {t.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span
              className={cn(
                "font-mono tabular-nums",
                t.changePct >= 0 ? "text-positive" : "text-negative"
              )}
            >
              {t.changePct >= 0 ? "+" : ""}
              {t.changePct.toFixed(2)}%
            </span>
          </div>
        ))}
      </div>

      {/* LIVE / SIM badge */}
      <div className="flex items-center gap-1.5 px-3 border-l border-border shrink-0">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-positive">
            <span className="w-1.5 h-1.5 rounded-full bg-positive animate-pulse" />
            <Wifi size={10} />
            LIVE
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <Database size={10} />
            SIM
          </span>
        )}
      </div>
    </div>
  );
}
