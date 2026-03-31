"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { generateCompetitorData } from "@/data/simulated";
import { cn } from "@/lib/utils";

const competitors = generateCompetitorData();

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Benchmarks</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
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
                  <ColoredValue value={c.organic_growth_pct} suffix="%" />
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono tabular-nums text-xs">
                    {c.operating_margin_pct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <span className="font-mono tabular-nums text-xs">
                    {c.revenue_bn.toFixed(1)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
