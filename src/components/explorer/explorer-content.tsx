"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Database,
  Table2,
  Columns3,
  ChevronRight,
  ChevronDown,
  Loader2,
  Eye,
  BarChart3,
  ArrowUpDown,
  Search,
  Play,
  AlertCircle,
  Terminal,
  Undo2,
  Redo2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useUIStore, type DataMode } from "@/stores/ui-store";
import {
  type UndoRedoState,
  createUndoRedoState,
  pushState as urPush,
  undo as urUndo,
  redo as urRedo,
  canUndo as urCanUndo,
  canRedo as urCanRedo,
} from "@/lib/undo-redo";

// ---- Explorer state snapshot for undo/redo --------------------------------

interface ExplorerSnapshot {
  selectedTable: string | null;
  selectedColumns: string[];
  tableFilter: string;
}

// ---- Types ----------------------------------------------------------------

interface TableInfo {
  name: string;
  type: "TABLE" | "VIEW";
  columns: number;
  category: string;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  comment: string;
}

type SortDir = "asc" | "desc" | null;

interface TablesApiResponse {
  tables: TableInfo[];
  mode: string;
  catalog?: string;
  schema?: string;
}

interface ColumnsApiResponse {
  columns: ColumnInfo[];
}

interface PreviewApiResponse {
  rows: Record<string, unknown>[];
  count: number;
  totalCount?: number;
}

interface QueryApiResponse {
  rows: Record<string, unknown>[];
  count: number;
  error?: string;
}

// ---- Data fetching hook ---------------------------------------------------

function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (r) => {
        const json = await r.json();
        if (!cancelled) {
          if (!r.ok || json.error) {
            setError(json.error || `HTTP ${r.status}`);
            setData(null);
          } else {
            setData(json as T);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Network error");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, loading, error };
}

// ---- Helpers --------------------------------------------------------------

const MODE_LABELS: Record<DataMode, string> = {
  simulated: "SIM",
  real: "LIVE",
};

const MODE_COLORS: Record<DataMode, string> = {
  simulated: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  real: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};

function isNumericType(dataType: string): boolean {
  return /DECIMAL|INT|FLOAT|DOUBLE|BIGINT|LONG|SHORT|TINYINT|SMALLINT|NUMBER/i.test(dataType);
}

function isView(table: TableInfo): boolean {
  if (table.type === "VIEW") return true;
  // Fallback: check name pattern for Databricks which may report views as TABLE
  if (table.name.includes("vw_") || table.name.includes("_vw")) return true;
  return false;
}

/** Category classifier for FinSight tables */
function clientCategorizeTable(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("vw_pl_")) return "Views - P&L";
  if (n.includes("vw_ncfo")) return "Views - NCFO";
  if (n.includes("vw_")) return "Views";
  if (n.includes("dim_")) return "Dimensions";
  if (n.includes("_date") || n.endsWith("date")) return "Dimensions";
  if (n.includes("composite_item") || n.includes("_item")) return "Products";
  if (n.includes("customer")) return "Customers";
  if (n.includes("economic_cell")) return "Economic";
  if (n.includes("replan")) return "Replan";
  if (n.includes("financial")) return "Financial";
  if (n.includes("rls") || n.includes("_rls")) return "System";
  if (n.includes("rl_formula") || n.includes("rl_input")) return "Reporting Lines";
  return "Other";
}

function formatCellValue(value: unknown, dataType: string): string {
  if (value === null || value === undefined) return "NULL";

  // Arrays
  if (Array.isArray(value)) {
    const items = value.map((v) => (v === null ? "null" : String(v)));
    const display = `[${items.join(", ")}]`;
    return display.length > 80 ? display.slice(0, 77) + "..." : display;
  }

  // Objects / maps / structs
  if (typeof value === "object" && value !== null) {
    try {
      const display = JSON.stringify(value);
      return display.length > 80 ? display.slice(0, 77) + "..." : display;
    } catch {
      return String(value);
    }
  }

  // Booleans
  if (typeof value === "boolean" || /BOOLEAN/i.test(dataType)) {
    return String(value).toLowerCase();
  }

  // Numeric types
  if (isNumericType(dataType)) {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (/DECIMAL|FLOAT|DOUBLE/i.test(dataType)) return num.toFixed(4);
    return num.toLocaleString("en-US");
  }

  // Timestamps / dates
  if (/TIMESTAMP|DATE/i.test(dataType)) {
    return String(value);
  }

  // Strings
  const str = String(value);
  return str.length > 80 ? str.slice(0, 77) + "..." : str;
}

// ---- Error banner ---------------------------------------------------------

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ---- Paginated row count display ------------------------------------------

const PAGE_SIZE = 50;

// ---- Component ------------------------------------------------------------

export function ExplorerContent() {
  const dataMode = useUIStore((s) => s.dataMode);

  // Selection state
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set()
  );
  const [chartXColumn, setChartXColumn] = useState<string | null>(null);
  const [chartYColumn, setChartYColumn] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [tableFilter, setTableFilter] = useState("");
  const [columnsExpanded, setColumnsExpanded] = useState(true);

  // Sort state
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Pagination
  const [visibleRowCount, setVisibleRowCount] = useState(PAGE_SIZE);

  // Preview state
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewTotalCount, setPreviewTotalCount] = useState<number>(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // SQL tab state
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlRows, setSqlRows] = useState<Record<string, unknown>[]>([]);
  const [sqlColumns, setSqlColumns] = useState<ColumnInfo[]>([]);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRowCount, setSqlRowCount] = useState(0);
  const sqlTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Connection info from tables API
  const [catalogName, setCatalogName] = useState<string>("");
  const [schemaName, setSchemaName] = useState<string>("");

  // Undo/Redo state — FR8.11
  const [undoRedo, setUndoRedo] = useState<UndoRedoState<ExplorerSnapshot>>(
    createUndoRedoState<ExplorerSnapshot>({
      selectedTable: null,
      selectedColumns: [],
      tableFilter: "",
    })
  );
  const undoRedoRef = useRef(undoRedo);
  undoRedoRef.current = undoRedo;

  /** Push current explorer state to undo history */
  const pushUndoState = useCallback(() => {
    const snapshot: ExplorerSnapshot = {
      selectedTable,
      selectedColumns: Array.from(selectedColumns),
      tableFilter,
    };
    setUndoRedo((prev) => urPush(prev, snapshot));
  }, [selectedTable, selectedColumns, tableFilter]);

  /** Restore a snapshot to the explorer state */
  const restoreSnapshot = useCallback((snapshot: ExplorerSnapshot) => {
    setSelectedTable(snapshot.selectedTable);
    setSelectedColumns(new Set(snapshot.selectedColumns));
    setTableFilter(snapshot.tableFilter);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoRedo((prev) => {
      if (!urCanUndo(prev)) return prev;
      const next = urUndo(prev);
      restoreSnapshot(next.present);
      return next;
    });
  }, [restoreSnapshot]);

  const handleRedo = useCallback(() => {
    setUndoRedo((prev) => {
      if (!urCanRedo(prev)) return prev;
      const next = urRedo(prev);
      restoreSnapshot(next.present);
      return next;
    });
  }, [restoreSnapshot]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // Active main tab
  const [activeTab, setActiveTab] = useState("data");

  // Reset everything when mode changes
  useEffect(() => {
    setSelectedTable(null);
    setPreviewRows([]);
    setPreviewError(null);
    setPreviewTotalCount(0);
    setSqlQuery("");
    setSqlRows([]);
    setSqlColumns([]);
    setSqlError(null);
    setVisibleRowCount(PAGE_SIZE);
    setTableFilter("");
  }, [dataMode]);

  // Fetch tables (re-fetches when mode changes)
  const {
    data: tablesData,
    loading: tablesLoading,
    error: tablesError,
  } = useApi<TablesApiResponse>(`/api/databricks/tables?mode=${dataMode}`);

  // Update catalog/schema from API response
  useEffect(() => {
    if (tablesData) {
      setCatalogName(tablesData.catalog || "");
      setSchemaName(tablesData.schema || "");
    }
  }, [tablesData]);

  // Fetch columns when table selected
  const {
    data: columnsData,
    loading: columnsLoading,
    error: columnsError,
  } = useApi<ColumnsApiResponse>(
    selectedTable
      ? `/api/databricks/columns?table=${selectedTable}&mode=${dataMode}`
      : null
  );

  // Load preview data
  const loadPreview = useCallback(
    async (table: string) => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const res = await fetch(
          `/api/databricks/preview?table=${table}&limit=200&mode=${dataMode}`
        );
        const json = (await res.json()) as PreviewApiResponse;
        if (!res.ok || (json as unknown as { error?: string }).error) {
          setPreviewError(
            (json as unknown as { error?: string }).error || `HTTP ${res.status}`
          );
          setPreviewRows([]);
          setPreviewTotalCount(0);
        } else {
          setPreviewRows(json.rows || []);
          setPreviewTotalCount(json.totalCount || json.count || (json.rows || []).length);
        }
      } catch (err) {
        setPreviewError(
          err instanceof Error ? err.message : "Failed to load preview"
        );
        setPreviewRows([]);
        setPreviewTotalCount(0);
      }
      setPreviewLoading(false);
    },
    [dataMode]
  );

  // When table changes, load preview and reset
  useEffect(() => {
    if (selectedTable) {
      loadPreview(selectedTable);
      setSelectedColumns(new Set());
      setChartXColumn(null);
      setChartYColumn(null);
      setSortCol(null);
      setSortDir(null);
      setVisibleRowCount(PAGE_SIZE);
    } else {
      setPreviewRows([]);
      setPreviewError(null);
      setPreviewTotalCount(0);
    }
  }, [selectedTable, loadPreview]);

  // Auto-populate SQL when table is selected
  useEffect(() => {
    if (selectedTable && catalogName && schemaName) {
      setSqlQuery(
        `SELECT * FROM \`${catalogName}\`.\`${schemaName}\`.\`${selectedTable}\` LIMIT 100`
      );
    } else if (selectedTable) {
      setSqlQuery(`SELECT * FROM ${selectedTable} LIMIT 100`);
    }
  }, [selectedTable, catalogName, schemaName]);

  // Auto-select chart columns
  useEffect(() => {
    if (columnsData) {
      const cols = columnsData.columns;
      // Pick first numeric column for Y axis
      const numCol = cols.find((c) => isNumericType(c.dataType));
      if (numCol) setChartYColumn(numCol.name);
      // Pick first non-numeric column for X axis
      const labelCol = cols.find(
        (c) =>
          !/DECIMAL|INT|FLOAT|DOUBLE|BIGINT|LONG|BOOLEAN/i.test(c.dataType)
      );
      if (labelCol) setChartXColumn(labelCol.name);
    }
  }, [columnsData]);

  // Derived data
  const tables = useMemo(() => {
    if (!tablesData?.tables) return [];
    return tablesData.tables.map((t) => ({
      ...t,
      // Re-categorize on client for better labels
      category: t.category || clientCategorizeTable(t.name),
      // Fix VIEW detection
      type: isView(t) ? ("VIEW" as const) : t.type,
    }));
  }, [tablesData]);

  const columns = columnsData?.columns || [];
  const numericColumns = columns.filter((c) => isNumericType(c.dataType));

  // Group tables by category
  const groupedTables = useMemo(() => {
    const filtered = tables.filter(
      (t) =>
        t.name.toLowerCase().includes(tableFilter.toLowerCase()) ||
        t.category.toLowerCase().includes(tableFilter.toLowerCase())
    );
    const groups: Record<string, TableInfo[]> = {};
    for (const t of filtered) {
      const cat = t.category || "Other";
      (groups[cat] ??= []).push(t);
    }
    // Sort groups: Views first, then Dimensions, then Facts, then Other
    const order = ["Views", "Dimensions", "Products", "Customers", "Accounts", "Economic", "Financial", "Replan", "System", "Other"];
    const sorted: Record<string, TableInfo[]> = {};
    for (const key of order) {
      for (const [cat, items] of Object.entries(groups)) {
        if (cat.startsWith(key) || cat === key) {
          sorted[cat] = items;
        }
      }
    }
    // Add any remaining groups
    for (const [cat, items] of Object.entries(groups)) {
      if (!(cat in sorted)) sorted[cat] = items;
    }
    return sorted;
  }, [tables, tableFilter]);

  // Quick-start tables: first 4 from the API
  const quickStartTables = useMemo(() => {
    return tables.slice(0, 4).map((t) => t.name);
  }, [tables]);

  // Sorted preview data
  const sortedPreview = useMemo(() => {
    if (!sortCol || !sortDir) return previewRows;
    return [...previewRows].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const numA = Number(aVal);
      const numB = Number(bVal);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [previewRows, sortCol, sortDir]);

  // Paginated rows
  const paginatedRows = useMemo(
    () => sortedPreview.slice(0, visibleRowCount),
    [sortedPreview, visibleRowCount]
  );

  // Display columns for the data table
  const displayColumns = useMemo(() => {
    if (selectedColumns.size > 0) {
      return columns.filter((c) => selectedColumns.has(c.name));
    }
    return columns;
  }, [columns, selectedColumns]);

  // Chart data
  const chartData = useMemo(() => {
    if (!chartYColumn || previewRows.length === 0) return [];
    return previewRows.slice(0, 100).map((row, i) => ({
      label: chartXColumn ? String(row[chartXColumn] ?? i) : String(i),
      value: Number(row[chartYColumn]) || 0,
    }));
  }, [previewRows, chartYColumn, chartXColumn]);

  // SQL columns derived from result rows
  const sqlDisplayColumns = useMemo(() => {
    if (sqlColumns.length > 0) return sqlColumns;
    if (sqlRows.length === 0) return [];
    // Infer from first row
    return Object.keys(sqlRows[0]).map((k) => ({
      name: k,
      dataType: "STRING",
      nullable: true,
      comment: "",
    }));
  }, [sqlColumns, sqlRows]);

  const toggleColumn = (name: string) => {
    pushUndoState(); // Track column changes for undo
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  // Run raw SQL query
  const runSqlQuery = useCallback(async () => {
    if (!sqlQuery.trim()) return;
    setSqlLoading(true);
    setSqlError(null);
    setSqlRows([]);
    setSqlColumns([]);
    setSqlRowCount(0);
    try {
      const res = await fetch("/api/databricks/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "__raw_sql__",
          columns: [],
          filters: [],
          limit: 1000,
          mode: dataMode,
          sql: sqlQuery.trim(),
        }),
      });
      const json = (await res.json()) as QueryApiResponse;
      if (!res.ok || json.error) {
        setSqlError(json.error || `HTTP ${res.status}`);
      } else {
        setSqlRows(json.rows || []);
        setSqlRowCount(json.count || (json.rows || []).length);
      }
    } catch (err) {
      setSqlError(
        err instanceof Error ? err.message : "Query execution failed"
      );
    }
    setSqlLoading(false);
  }, [sqlQuery, dataMode]);

  // Handle Ctrl+Enter in SQL textarea
  const handleSqlKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runSqlQuery();
      }
    },
    [runSqlQuery]
  );

  // Current table info
  const currentTableInfo = useMemo(
    () => tables.find((t) => t.name === selectedTable),
    [tables, selectedTable]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Data Explorer</h1>
          <p className="text-sm text-muted-foreground">
            Browse Databricks tables, run SQL queries, and visualize data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons — FR8.11 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={!urCanUndo(undoRedo)}
            title="Undo (Ctrl+Z)"
            className="h-8 w-8"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRedo}
            disabled={!urCanRedo(undoRedo)}
            title="Redo (Ctrl+Shift+Z)"
            className="h-8 w-8"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>

          {selectedTable && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
              <Database className="h-3 w-3" />
              {catalogName && (
                <>
                  <span>{catalogName}</span>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              {schemaName && (
                <>
                  <span>{schemaName}</span>
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
              <span className="font-medium text-foreground">
                {selectedTable}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* ---- Left sidebar: Table & Column browser ---- */}
        <div className="col-span-3 space-y-3">
          {/* Connection badge */}
          <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-mono">
                {catalogName && schemaName
                  ? `${catalogName}.${schemaName}`
                  : dataMode === "simulated"
                    ? "simulated"
                    : "connecting..."}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center justify-center h-5 rounded-4xl px-2 text-[10px] font-medium whitespace-nowrap",
                MODE_COLORS[dataMode]
              )}
            >
              {MODE_LABELS[dataMode]}
            </span>
          </div>

          {/* Table list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Table2 className="h-4 w-4" />
                Tables
                <Badge variant="secondary" className="ml-auto">
                  {tables.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  placeholder="Filter tables..."
                  className="pl-7 h-7 text-xs"
                />
              </div>
              {tablesError && <ErrorBanner message={tablesError} />}
              <div className="max-h-[420px] overflow-y-auto space-y-3">
                {tablesLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      Loading tables...
                    </span>
                  </div>
                ) : (
                  Object.entries(groupedTables).map(([category, items]) => (
                    <div key={category}>
                      <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {category}
                      </div>
                      {items.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => {
                            pushUndoState();
                            setSelectedTable(
                              selectedTable === t.name ? null : t.name
                            );
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                            selectedTable === t.name
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <Table2 className="h-3 w-3 shrink-0" />
                          <span className="truncate font-mono">
                            {t.name.replace("finiq_", "")}
                          </span>
                          {isView(t) && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-[9px] h-4 px-1"
                            >
                              VIEW
                            </Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column list (shows when table selected) */}
          {selectedTable && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                  onClick={() => setColumnsExpanded(!columnsExpanded)}
                >
                  {columnsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Columns3 className="h-4 w-4" />
                  Columns
                  <Badge variant="secondary" className="ml-auto">
                    {columns.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              {columnsExpanded && (
                <CardContent>
                  {columnsError && <ErrorBanner message={columnsError} />}
                  {columnsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto space-y-0.5">
                      {columns.length > 0 && (
                        <button
                          onClick={() => setSelectedColumns(new Set())}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors",
                            selectedColumns.size === 0
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50 text-muted-foreground"
                          )}
                        >
                          <Eye className="h-3 w-3" />
                          All columns
                        </button>
                      )}
                      {columns.map((col, colIdx) => (
                        <div
                          key={`${col.name}-${colIdx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleColumn(col.name)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              toggleColumn(col.name);
                          }}
                          className={cn(
                            "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors cursor-pointer",
                            selectedColumns.has(col.name)
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div
                            className={cn(
                              "h-3 w-3 shrink-0 rounded border transition-colors",
                              selectedColumns.has(col.name)
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/30"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-mono">{col.name}</div>
                            <div className="text-[9px] text-muted-foreground">
                              {col.dataType}
                              {col.comment && ` \u2014 ${col.comment}`}
                            </div>
                          </div>
                          {isNumericType(col.dataType) && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setChartYColumn(col.name);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  setChartYColumn(col.name);
                                }
                              }}
                              title="Chart this column"
                              className={cn(
                                "shrink-0 rounded p-0.5 transition-colors",
                                chartYColumn === col.name
                                  ? "text-primary"
                                  : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary"
                              )}
                            >
                              <BarChart3 className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* ---- Main area ---- */}
        <div className="col-span-9 space-y-4">
          {!selectedTable ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <h2 className="text-sm font-medium">
                  Select a table to explore
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Choose a table or view from the left panel, or click one of
                  the quick-start options below.
                </p>
                {quickStartTables.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {quickStartTables.map((t) => (
                      <Button
                        key={t}
                        variant="outline"
                        size="xs"
                        onClick={() => { pushUndoState(); setSelectedTable(t); }}
                        className="font-mono text-[10px]"
                      >
                        {t.replace("finiq_", "")}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="data">
                  <Table2 className="mr-1 h-3.5 w-3.5" />
                  Data
                </TabsTrigger>
                <TabsTrigger value="sql">
                  <Terminal className="mr-1 h-3.5 w-3.5" />
                  SQL
                </TabsTrigger>
                <TabsTrigger value="chart">
                  <BarChart3 className="mr-1 h-3.5 w-3.5" />
                  Chart
                </TabsTrigger>
              </TabsList>

              {/* ---- Tab 1: Data ---- */}
              <TabsContent value="data">
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Table2 className="h-4 w-4" />
                      {selectedTable?.replace("finiq_", "")}
                      {currentTableInfo && isView(currentTableInfo) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1"
                        >
                          VIEW
                        </Badge>
                      )}
                      {currentTableInfo && !isView(currentTableInfo) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1"
                        >
                          TABLE
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-mono">
                        {previewRows.length}
                        {previewTotalCount > previewRows.length
                          ? ` of ${previewTotalCount.toLocaleString()}`
                          : ""}{" "}
                        rows
                      </Badge>
                      <Badge variant="secondary" className="font-mono">
                        {columns.length} cols
                      </Badge>
                      {selectedColumns.size > 0 && (
                        <Badge variant="outline" className="font-mono">
                          {selectedColumns.size} selected
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {previewLoading && (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Querying Databricks... this may take a moment for
                            large views
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {previewError && <ErrorBanner message={previewError} />}

                    {/* Column visibility toolbar (compact for tables with many columns) */}
                    {columns.length > 0 && columns.length <= 20 && (
                      <div className="flex flex-wrap items-center gap-1 pb-1">
                        <span className="text-[10px] text-muted-foreground mr-1">
                          Columns:
                        </span>
                        {columns.map((col, ci) => (
                          <button
                            key={`tb-${col.name}-${ci}`}
                            onClick={() => toggleColumn(col.name)}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors border",
                              selectedColumns.size === 0 ||
                                selectedColumns.has(col.name)
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "text-muted-foreground/50 border-transparent hover:border-border"
                            )}
                          >
                            {col.name}
                          </button>
                        ))}
                        {selectedColumns.size > 0 && (
                          <button
                            onClick={() => setSelectedColumns(new Set())}
                            className="text-[10px] text-muted-foreground hover:text-foreground ml-1 underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    )}
                    {columns.length > 20 && (
                      <div className="flex items-center gap-2 pb-1 text-[10px] text-muted-foreground">
                        <span>{columns.length} columns — use the column panel on the left to toggle visibility</span>
                        {selectedColumns.size > 0 && (
                          <button
                            onClick={() => setSelectedColumns(new Set())}
                            className="text-muted-foreground hover:text-foreground underline"
                          >
                            Reset ({selectedColumns.size} selected)
                          </button>
                        )}
                      </div>
                    )}

                    <div className="max-h-[500px] overflow-auto rounded-md border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {displayColumns.map((col, colIdx) => (
                              <TableHead
                                key={`${col.name}-${colIdx}`}
                                className="cursor-pointer select-none whitespace-nowrap"
                                onClick={() => handleSort(col.name)}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[10px]">
                                    {col.name}
                                  </span>
                                  <ArrowUpDown
                                    className={cn(
                                      "h-3 w-3 transition-colors",
                                      sortCol === col.name
                                        ? "text-primary"
                                        : "text-muted-foreground/30"
                                    )}
                                  />
                                </div>
                                <div className="text-[9px] font-normal text-muted-foreground/60">
                                  {col.dataType}
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedRows.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={displayColumns.length || 1}
                                className="text-center py-8 text-muted-foreground"
                              >
                                {previewLoading
                                  ? "Querying Databricks... this may take a moment for large views"
                                  : "No data"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedRows.map((row, rowIdx) => (
                              <TableRow key={rowIdx}>
                                {displayColumns.map((col, colIdx) => (
                                  <TableCell
                                    key={`${col.name}-${colIdx}`}
                                    className={cn(
                                      "font-mono text-xs max-w-[300px] truncate",
                                      isNumericType(col.dataType)
                                        ? "text-right tabular-nums"
                                        : "",
                                      (row[col.name] === null || row[col.name] === undefined)
                                        ? "text-muted-foreground/40 italic"
                                        : ""
                                    )}
                                    title={String(row[col.name] ?? "")}
                                  >
                                    {formatCellValue(
                                      row[col.name],
                                      col.dataType
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination / load more */}
                    {sortedPreview.length > visibleRowCount && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">
                          Showing {visibleRowCount} of{" "}
                          {sortedPreview.length} rows
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            setVisibleRowCount((v) =>
                              Math.min(v + PAGE_SIZE, sortedPreview.length)
                            )
                          }
                        >
                          Load more ({PAGE_SIZE})
                        </Button>
                      </div>
                    )}
                    {sortedPreview.length > 0 &&
                      sortedPreview.length <= visibleRowCount && (
                        <div className="text-xs text-muted-foreground pt-1">
                          Showing all {sortedPreview.length} rows
                          {previewTotalCount > sortedPreview.length
                            ? ` (${previewTotalCount.toLocaleString()} total in table)`
                            : ""}
                        </div>
                      )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---- Tab 2: SQL ---- */}
              <TabsContent value="sql">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Terminal className="h-4 w-4" />
                      Custom SQL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dataMode === "simulated" && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Custom SQL is only available in LIVE or CUSTOMER mode.
                          Switch modes to use this feature.
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      <textarea
                        ref={sqlTextareaRef}
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        onKeyDown={handleSqlKeyDown}
                        placeholder="Enter SQL query..."
                        rows={5}
                        className="w-full rounded-lg border border-border bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                        spellCheck={false}
                      />
                      <div className="absolute right-2 bottom-2 text-[9px] text-zinc-500">
                        Ctrl+Enter to run
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={runSqlQuery}
                        disabled={
                          sqlLoading ||
                          !sqlQuery.trim() ||
                          dataMode === "simulated"
                        }
                      >
                        {sqlLoading ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="mr-1 h-3.5 w-3.5" />
                        )}
                        Run Query
                      </Button>
                      {sqlLoading && (
                        <span className="text-xs text-muted-foreground">
                          Executing query... this may take a moment
                        </span>
                      )}
                      {sqlRowCount > 0 && !sqlLoading && (
                        <Badge variant="secondary" className="font-mono">
                          {sqlRowCount} rows returned
                        </Badge>
                      )}
                    </div>

                    {sqlError && <ErrorBanner message={sqlError} />}

                    {sqlRows.length > 0 && (
                      <div className="max-h-[400px] overflow-auto rounded-md border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {sqlDisplayColumns.map((col, ci) => (
                                <TableHead
                                  key={`sql-h-${col.name}-${ci}`}
                                  className="whitespace-nowrap"
                                >
                                  <span className="font-mono text-[10px]">
                                    {col.name}
                                  </span>
                                  {col.dataType !== "STRING" && (
                                    <div className="text-[9px] font-normal text-muted-foreground/60">
                                      {col.dataType}
                                    </div>
                                  )}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sqlRows.map((row, rowIdx) => (
                              <TableRow key={rowIdx}>
                                {sqlDisplayColumns.map((col, ci) => (
                                  <TableCell
                                    key={`sql-c-${col.name}-${ci}`}
                                    className={cn(
                                      "font-mono text-xs",
                                      isNumericType(col.dataType)
                                        ? "text-right tabular-nums"
                                        : ""
                                    )}
                                  >
                                    {formatCellValue(
                                      row[col.name],
                                      col.dataType
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---- Tab 3: Chart ---- */}
              <TabsContent value="chart">
                <Card>
                  <CardHeader className="flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">
                      {selectedTable?.replace("finiq_", "")}
                      {chartYColumn && (
                        <>
                          {" \u2014 "}
                          <span className="font-mono text-primary">
                            {chartYColumn}
                          </span>
                        </>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* X axis selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          X:
                        </span>
                        <select
                          value={chartXColumn || ""}
                          onChange={(e) =>
                            setChartXColumn(e.target.value || null)
                          }
                          className="h-6 rounded border border-border bg-card text-foreground px-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">(index)</option>
                          {columns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Y axis selector */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">
                          Y:
                        </span>
                        <select
                          value={chartYColumn || ""}
                          onChange={(e) =>
                            setChartYColumn(e.target.value || null)
                          }
                          className="h-6 rounded border border-border bg-card text-foreground px-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">Select column</option>
                          {numericColumns.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Chart type toggle */}
                      <div className="flex items-center rounded-md border border-border">
                        <button
                          onClick={() => setChartType("area")}
                          className={cn(
                            "px-2 py-0.5 text-[10px] transition-colors rounded-l-md",
                            chartType === "area"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          Area
                        </button>
                        <button
                          onClick={() => setChartType("bar")}
                          className={cn(
                            "px-2 py-0.5 text-[10px] transition-colors rounded-r-md",
                            chartType === "bar"
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          Bar
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!chartYColumn ? (
                      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                        Select a numeric column for the Y axis
                      </div>
                    ) : chartData.length === 0 ? (
                      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                        No data to chart
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          {chartType === "area" ? (
                            <AreaChart data={chartData}>
                              <defs>
                                <linearGradient
                                  id="explorerGrad"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0.3}
                                  />
                                  <stop
                                    offset="100%"
                                    stopColor="#3b82f6"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 9, fill: "#888" }}
                                interval="preserveStartEnd"
                                angle={-30}
                                textAnchor="end"
                                height={50}
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: "#888" }}
                                width={65}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "oklch(0.16 0.005 250)",
                                  border: "1px solid oklch(0.25 0.005 250)",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={1.5}
                                fill="url(#explorerGrad)"
                                name={chartYColumn}
                              />
                            </AreaChart>
                          ) : (
                            <BarChart data={chartData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.06)"
                              />
                              <XAxis
                                dataKey="label"
                                tick={{ fontSize: 9, fill: "#888" }}
                                interval="preserveStartEnd"
                                angle={-30}
                                textAnchor="end"
                                height={50}
                              />
                              <YAxis
                                tick={{ fontSize: 9, fill: "#888" }}
                                width={65}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "oklch(0.16 0.005 250)",
                                  border: "1px solid oklch(0.25 0.005 250)",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                }}
                              />
                              <Bar
                                dataKey="value"
                                fill="#3b82f6"
                                radius={[2, 2, 0, 0]}
                                name={chartYColumn}
                              />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
