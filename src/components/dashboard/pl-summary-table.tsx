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
import { cn } from "@/lib/utils";

function ColoredChange({ value, suffix = "%" }: { value: number; suffix?: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-mono tabular-nums",
        value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-muted-foreground"
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
}

interface PLRow {
  Entity: string;
  "Revenue ($M)"?: string;
  "Rev YoY"?: string;
  "OG %"?: string;
  "MAC ($M)"?: string;
  "CE ($M)"?: string;
}

export function PLSummaryTable() {
  const [rows, setRows] = useState<PLRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      for (let attempt = 0; attempt < 60; attempt++) {
        if (cancelled) return;
        try {
          const res = await fetch("/api/dashboard");
          if (res.status === 202) { await new Promise((r) => setTimeout(r, 5000)); continue; }
          if (!res.ok) return;
          const json = await res.json();
          if (!cancelled && json.plSummary?.rows?.length > 0) {
            setRows(json.plSummary.rows);
            setColumns(json.plSummary.columns);
          }
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
    fetchData().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>P&L Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading live data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>P&L Summary</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            No P&L data available. Check Databricks connection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Summary — Live Databricks</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className={col === "Entity" ? "pl-4" : "text-right"}>
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell
                    key={col}
                    className={cn(
                      "text-xs font-mono tabular-nums",
                      col === "Entity" ? "pl-4 font-medium font-sans" : "text-right",
                      col === "Rev YoY" && String(row[col as keyof PLRow] ?? "").startsWith("-")
                        ? "text-red-400"
                        : col === "Rev YoY"
                        ? "text-emerald-400"
                        : ""
                    )}
                  >
                    {String(row[col as keyof PLRow] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
