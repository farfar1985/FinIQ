"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Download } from "lucide-react";

interface DataTableProps {
  data: Record<string, string>[];
  maxRows?: number;
}

export default function DataTable({ data, maxRows = 50 }: DataTableProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const columns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);

  const numericCols = useMemo(() => {
    const set = new Set<string>();
    for (const col of columns) {
      const allNumeric = data.every((row) => {
        const val = row[col]?.trim();
        return !val || !isNaN(parseFloat(val));
      });
      if (allNumeric) set.add(col);
    }
    return set;
  }, [data, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return data.slice(0, maxRows);
    return [...data]
      .sort((a, b) => {
        const aVal = a[sortCol] ?? "";
        const bVal = b[sortCol] ?? "";
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDir === "asc" ? aNum - bNum : bNum - aNum;
        }
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      })
      .slice(0, maxRows);
  }, [data, sortCol, sortDir, maxRows]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleExport = () => {
    const header = columns.join(",");
    const rows = sorted.map((row) =>
      columns.map((col) => `"${(row[col] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finiq-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {data.length} record{data.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download size={10} />
          Export
        </button>
      </div>
      <div className="overflow-auto max-h-80">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={cn(
                    "px-3 py-2 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap border-b border-border",
                    numericCols.has(col) ? "text-right" : "text-left"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col &&
                      (sortDir === "asc" ? (
                        <ChevronUp size={10} />
                      ) : (
                        <ChevronDown size={10} />
                      ))}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  "border-t border-border/50 hover:bg-primary/[0.03] transition-colors",
                  i % 2 === 0 ? "bg-card" : "bg-muted/20"
                )}
              >
                {columns.map((col) => {
                  const val = row[col] ?? "";
                  const num = parseFloat(val);
                  const isNum = numericCols.has(col) && !isNaN(num) && val.trim() !== "";
                  return (
                    <td
                      key={col}
                      className={cn(
                        "px-3 py-1.5 whitespace-nowrap font-mono",
                        numericCols.has(col) ? "text-right" : "text-left",
                        isNum && num > 0 && "text-positive",
                        isNum && num < 0 && "text-negative"
                      )}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
