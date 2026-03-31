"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface SimpleChartProps {
  data: Record<string, string>[];
  type?: "bar" | "area";
}

export function SimpleChart({ data, type }: SimpleChartProps) {
  const { chartData, xKey, chartType } = useMemo(() => {
    if (data.length === 0) return { chartData: [], xKey: "", yKey: "", chartType: "bar" as const };

    const cols = Object.keys(data[0]);
    const hasDateID = cols.includes("Date_ID");
    // Support both real Databricks (Unit_Alias, RL_Alias) and simulated (Entity_Alias, Account_Alias)
    const hasUnit = cols.includes("Unit_Alias") || cols.includes("Entity_Alias");
    const hasRL = cols.includes("RL_Alias") || cols.includes("Account_Alias");
    const unitCol = cols.includes("Unit_Alias") ? "Unit_Alias" : "Entity_Alias";
    const rlCol = cols.includes("RL_Alias") ? "RL_Alias" : "Account_Alias";

    // Find value column: prefer real Databricks _Value suffix, then simulated names
    const valueCol = cols.find((c) => c === "YTD_CY_Value" || c === "Periodic_CY_Value")
      || cols.find((c) => c.endsWith("_Value"))
      || cols.find((c) => c.includes("Value"))
      || cols.find((c) => {
        const sample = data[0][c];
        return sample && !isNaN(parseFloat(sample));
      });

    if (!valueCol) return { chartData: [], xKey: "", yKey: "", chartType: "bar" as const };

    let xKey = "label";
    let inferredType: "bar" | "area" = type || "bar";

    if (hasDateID && !hasUnit) {
      xKey = "Date_ID";
      inferredType = "area";
    } else if (hasUnit && hasRL) {
      xKey = unitCol;
    } else if (hasRL) {
      xKey = rlCol;
    } else if (hasUnit) {
      xKey = unitCol;
    }

    // If data has multiple reporting lines per unit, pivot by RL
    if (hasRL && hasUnit && data.length > 5) {
      const units = [...new Set(data.map((r) => r[unitCol]))];
      const rls = [...new Set(data.map((r) => r[rlCol]))];
      const targetRLs = rls.filter((a) =>
        ["Organic Growth", "MAC Shape", "Net Revenue", "Gross Profit"].includes(a)
      ).slice(0, 3);

      if (targetRLs.length > 0 && units.length > 1) {
        const pivoted = units.map((unit) => {
          const row: Record<string, string | number> = { Unit: unit };
          for (const rl of targetRLs) {
            const match = data.find((r) => r[unitCol] === unit && r[rlCol] === rl);
            row[rl] = match ? parseFloat(match[valueCol] || "0") : 0;
          }
          return row;
        });
        return {
          chartData: pivoted,
          xKey: "Unit",
          yKey: targetRLs[0],
          chartType: "bar" as const,
        };
      }
    }

    const chartData = data.slice(0, 30).map((row) => ({
      ...row,
      [valueCol]: parseFloat(row[valueCol] || "0"),
      label: row[xKey] || "",
    }));

    return { chartData, xKey, yKey: valueCol, chartType: inferredType };
  }, [data, type]);

  if (chartData.length === 0) return null;

  const allKeys = Object.keys(chartData[0]).filter(
    (k) => k !== xKey && k !== "label" && typeof chartData[0][k] === "number"
  );

  const colors = ["#4361ee", "#2ec4b6", "#e63946", "#f4a261", "#7209b7"];

  return (
    <div className="bg-card border border-border rounded-md p-3 h-56">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "area" ? (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            {allKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            {allKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
