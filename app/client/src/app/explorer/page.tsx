"use client";

import { useState, useEffect } from "react";
import { Database, ChevronRight, ChevronDown } from "lucide-react";

interface CatalogInfo {
  mode: string;
  tables: Record<string, { count: number; source: string }>;
}

export default function ExplorerPage() {
  const [catalog, setCatalog] = useState<CatalogInfo | null>(null);
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>("entities");

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()),
      fetch("/api/entities/hierarchy").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
    ])
      .then(([cat, ent, acc]) => {
        setCatalog(cat);
        setEntities(ent.entities || []);
        setAccounts(acc.accounts || []);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Data Explorer</h1>
        {catalog && (
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-[10px] text-muted-foreground">
            <Database className="h-3 w-3" />
            Mode: {catalog.mode}
          </span>
        )}
      </div>

      {/* Data catalog summary */}
      {catalog && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(catalog.tables).map(([name, info]) => (
            <div key={name} className="rounded-lg border border-border bg-card p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {name}
              </span>
              <div className="mt-1 text-lg font-semibold tabular-nums">{info.count}</div>
              <span className="text-[10px] text-muted-foreground">{info.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Entity hierarchy browser */}
      <CollapsibleSection
        title="Entity Hierarchy"
        count={entities.length}
        expanded={expandedSection === "entities"}
        onToggle={() => setExpandedSection(expandedSection === "entities" ? null : "entities")}
      >
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="th-financial px-3 py-2 text-left">Entity</th>
                <th className="th-financial px-3 py-2 text-left">Parent</th>
                <th className="th-financial px-3 py-2 text-right">Level</th>
              </tr>
            </thead>
            <tbody>
              {entities.slice(0, 50).map((e, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-1.5">{String(e.Entity_Alias)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{String(e.Parent_Alias || "—")}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{String(e.Entity_Level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entities.length > 50 && (
            <p className="py-2 text-center text-[10px] text-muted-foreground">
              Showing 50 of {entities.length} entities
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Account tree */}
      <CollapsibleSection
        title="Account Structure"
        count={accounts.length}
        expanded={expandedSection === "accounts"}
        onToggle={() => setExpandedSection(expandedSection === "accounts" ? null : "accounts")}
      >
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="th-financial px-3 py-2 text-left">Account</th>
                <th className="th-financial px-3 py-2 text-left">Parent</th>
                <th className="th-financial px-3 py-2 text-left">Statement</th>
                <th className="th-financial px-3 py-2 text-right">Sign</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-3 py-1.5">{String(a.Account_Alias)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{String(a.Parent_Account || "—")}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{String(a.Statement || "—")}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{String(a.Sign_Conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-secondary/30"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {title}
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
          {count}
        </span>
      </button>
      {expanded && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
