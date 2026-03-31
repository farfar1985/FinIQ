"use client";

import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  generateFinancialData,
  generateEntities,
  generateAccounts,
} from "@/data/simulated";
import { cn } from "@/lib/utils";

// Account codes for summary columns
const SUMMARY_ACCOUNTS = [
  { code: "S100010", label: "Net Revenue" },
  { code: "S900083", label: "OG%" },
  { code: "S200010", label: "MAC" },
  { code: "S300010", label: "CE" },
  { code: "S500010", label: "NCFO" },
];

interface GBURow {
  entityId: string;
  entityName: string;
  netRevenue: number;
  organicGrowth: number;
  mac: number;
  ce: number;
  ncfo: number;
  netRevenueChange: number;
  macChange: number;
  ceChange: number;
  ncfoChange: number;
}

function formatUSD(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}B`;
  }
  return `${value.toFixed(0)}M`;
}

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

export function PLSummaryTable() {
  const rows = useMemo(() => {
    const financialData = generateFinancialData();
    const entities = generateEntities();
    const gbus = entities.filter((e) => e.level === "GBU");

    // Use P06 as current period
    const period = "P06_2025";

    return gbus.map((gbu): GBURow => {
      const gbuData = financialData.filter(
        (r) => r.entity_id === gbu.id && r.date_id === period
      );

      function getAccount(code: string) {
        return gbuData.find((r) => r.account_code === code);
      }

      const nr = getAccount("S100010");
      const og = getAccount("S900083");
      const mac = getAccount("S200010");
      const ce = getAccount("S300010");
      const ncfo = getAccount("S500010");

      const nrCY = nr?.periodic_cy_value ?? 0;
      const nrLY = nr?.periodic_ly_value ?? 0;
      const nrChange = nrLY !== 0 ? ((nrCY - nrLY) / Math.abs(nrLY)) * 100 : 0;

      const macCY = mac?.periodic_cy_value ?? 0;
      const macLY = mac?.periodic_ly_value ?? 0;
      const macChange = macLY !== 0 ? ((macCY - macLY) / Math.abs(macLY)) * 100 : 0;

      const ceCY = ce?.periodic_cy_value ?? 0;
      const ceLY = ce?.periodic_ly_value ?? 0;
      const ceChange = ceLY !== 0 ? ((ceCY - ceLY) / Math.abs(ceLY)) * 100 : 0;

      const ncfoCY = ncfo?.periodic_cy_value ?? 0;
      const ncfoLY = ncfo?.periodic_ly_value ?? 0;
      const ncfoChange = ncfoLY !== 0 ? ((ncfoCY - ncfoLY) / Math.abs(ncfoLY)) * 100 : 0;

      return {
        entityId: gbu.id,
        entityName: gbu.name,
        netRevenue: nrCY,
        organicGrowth: og?.periodic_cy_value ?? 0,
        mac: macCY,
        ce: ceCY,
        ncfo: ncfoCY,
        netRevenueChange: nrChange,
        macChange,
        ceChange,
        ncfoChange,
      };
    });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Summary by GBU</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Entity</TableHead>
              <TableHead className="text-right">Net Revenue</TableHead>
              <TableHead className="text-right">OG%</TableHead>
              <TableHead className="text-right">MAC</TableHead>
              <TableHead className="text-right">CE</TableHead>
              <TableHead className="text-right pr-4">NCFO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.entityId}>
                <TableCell className="pl-4">
                  <span className="text-xs font-medium">{row.entityName}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono tabular-nums text-xs">
                      {formatUSD(row.netRevenue)}
                    </span>
                    <ColoredChange value={row.netRevenueChange} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-mono tabular-nums text-xs",
                      row.organicGrowth >= 4
                        ? "text-emerald-400"
                        : row.organicGrowth >= 2.5
                          ? "text-amber-400"
                          : "text-red-400"
                    )}
                  >
                    {row.organicGrowth.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono tabular-nums text-xs">
                      {formatUSD(row.mac)}
                    </span>
                    <ColoredChange value={row.macChange} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono tabular-nums text-xs">
                      {formatUSD(row.ce)}
                    </span>
                    <ColoredChange value={row.ceChange} />
                  </div>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <div className="flex flex-col items-end">
                    <span className="font-mono tabular-nums text-xs">
                      {formatUSD(row.ncfo)}
                    </span>
                    <ColoredChange value={row.ncfoChange} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
