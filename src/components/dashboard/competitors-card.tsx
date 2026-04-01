"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { generateCompetitorData, type CompetitorRow } from "@/data/simulated";
import { cn } from "@/lib/utils";

function ColoredValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  return (
    <span
      className={cn(
        "font-mono tabular-nums text-xs",
        value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-foreground"
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

export function CompetitorsCard() {
  const [competitors, setCompetitors] = useState<CompetitorRow[]>(generateCompetitorData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchCompetitors() {
      try {
        // Fetch from FMP dashboard endpoint
        const res = await fetch("/api/fmp/dashboard");
        if (!res.ok) throw new Error("FMP fetch failed");
        const json = await res.json();
        if (!cancelled && json.competitors && json.competitors.length > 0) {
          // Map FMP field names to our interface
          const mapped: CompetitorRow[] = json.competitors.map((c: Record<string, unknown>) => ({
            company: c.name || c.company || "",
            ticker: c.ticker || "",
            organic_growth_pct: c.organic_growth_pct ?? c.revenueGrowth ?? 0,
            gross_margin_pct: c.gross_margin_pct ?? c.grossMargin ?? 0,
            operating_margin_pct: c.operating_margin_pct ?? c.operatingMargin ?? 0,
            ebitda_margin_pct: c.ebitda_margin_pct ?? c.ebitdaMargin ?? 0,
            pe_ratio: c.pe_ratio ?? c.pe ?? 0,
            market_cap_bn: c.market_cap_bn ?? ((c.marketCap as number || 0) / 1_000_000_000),
            revenue_bn: c.revenue_bn ?? ((c.revenue as number || 0) / 1_000_000_000),
          }));
          setCompetitors(mapped);
        }
      } catch {
        // Keep simulated fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCompetitors();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Benchmarks</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Company</TableHead>
                <TableHead className="text-right">OG%</TableHead>
                <TableHead className="text-right">Margin%</TableHead>
                <TableHead className="text-right pr-4">Rev $B</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((c) => (
                <TableRow key={c.ticker}>
                  <TableCell className="pl-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{c.company}</span>
                      <span className="text-[10px] text-muted-foreground">{c.ticker}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ColoredValue value={c.organic_growth_pct ?? 0} suffix="%" />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono tabular-nums text-xs">
                      {(c.operating_margin_pct ?? 0).toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <span className="font-mono tabular-nums text-xs">
                      {(c.revenue_bn ?? 0).toFixed(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
