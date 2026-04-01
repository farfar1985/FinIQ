"use client";

import { useState } from "react";
import {
  Settings,
  FileText,
  Users,
  Server,
  Pencil,
  Trash2,
  TestTube,
  Save,
  CheckCircle2,
  XCircle,
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
import { useUIStore } from "@/stores/ui-store";

const TABS = [
  { id: "connection", label: "Connection", icon: Settings },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "users", label: "Users & RBAC", icon: Users },
  { id: "system", label: "System", icon: Server },
] as const;

// FR7.5: RBAC role definitions
const RBAC_ROLES = [
  { role: "Admin", permissions: "Full access: configure, manage users, all data, all features", count: 2 },
  { role: "Analyst", permissions: "Query, reports, exports, data explorer, job management", count: 8 },
  { role: "Executive", permissions: "Dashboards, reports, CI, submit queries/jobs (read-focused)", count: 15 },
  { role: "Viewer", permissions: "View-only: dashboards and competitive intelligence", count: 25 },
];

// FR7.2: Org hierarchy
const ORG_HIERARCHY = [
  { level: 0, name: "Mars Incorporated", units: 1 },
  { level: 1, name: "GBUs", units: 5, examples: "Petcare, Snacking, Food & Nutrition, Mars Wrigley, Global Corporate" },
  { level: 2, name: "Divisions", units: 20, examples: "Petcare NA, Petcare EU, Snacking Legacy, Wrigley Intl" },
  { level: 3, name: "Regions", units: 50, examples: "MW USA Market, RC France Market, PN UK Market" },
  { level: 4, name: "Sub-regions", units: 150, examples: "AC Denmark Market, AC Israel Market, MW Germany Market" },
  { level: 5, name: "Markets", units: 540, examples: "766 total Unit_Alias values in Databricks" },
];

// FR7.3: Peer group configuration
const PEER_GROUPS = [
  { id: "pg1", name: "Global Confectionery", companies: "Mars, Mondelez, Hershey, Ferrero, Nestlé", metrics: "OG%, Revenue, Gross Margin" },
  { id: "pg2", name: "Petcare Leaders", companies: "Mars Petcare, Nestlé Purina, Colgate (Hill's), Freshpet, IDEXX", metrics: "OG%, Revenue, Market Share" },
  { id: "pg3", name: "Global FMCG", companies: "Mars, P&G, Unilever, Nestlé, General Mills, Kraft Heinz, Kellanova", metrics: "OG%, Operating Margin, EBITDA" },
  { id: "pg4", name: "Snacking Peers", companies: "Mars Wrigley, Mondelez, Hershey, J.M. Smucker, General Mills", metrics: "OG%, MAC%, A&CP%" },
];

type TabId = (typeof TABS)[number]["id"];

const TEMPLATES = [
  { id: "t1", name: "PES Summary", description: "Period End Summary across all GBUs", lastModified: "2025-06-15" },
  { id: "t2", name: "PES WWW", description: "What Went Well analysis template", lastModified: "2025-06-12" },
  { id: "t3", name: "PES WNWW", description: "What Not Went Well analysis template", lastModified: "2025-06-12" },
  { id: "t4", name: "Budget Variance", description: "Actual vs Replan variance report", lastModified: "2025-06-10" },
  { id: "t5", name: "Competitive P2P", description: "Peer-to-peer competitive benchmarking", lastModified: "2025-06-08" },
];

const USERS = [
  { name: "Sarah Chen", email: "sarah.chen@mars.com", role: "Admin", gbuAccess: "All GBUs", lastLogin: "2025-06-28 09:14" },
  { name: "James Wilson", email: "james.wilson@mars.com", role: "Analyst", gbuAccess: "Petcare, Snacking", lastLogin: "2025-06-28 08:45" },
  { name: "Priya Sharma", email: "priya.sharma@mars.com", role: "Analyst", gbuAccess: "Food & Nutrition", lastLogin: "2025-06-27 16:30" },
  { name: "Michael Brown", email: "michael.brown@mars.com", role: "Viewer", gbuAccess: "Mars Wrigley", lastLogin: "2025-06-26 11:20" },
  { name: "Emma Taylor", email: "emma.taylor@mars.com", role: "Viewer", gbuAccess: "All GBUs", lastLogin: "2025-06-25 14:05" },
];

const SYSTEM_HEALTH = [
  { name: "API Status", status: "healthy", detail: "Response time: 42ms", uptime: "99.97%" },
  { name: "Databricks Status", status: "healthy", detail: "Cluster: running, 4 nodes", uptime: "99.92%" },
  { name: "Cache Status", status: "healthy", detail: "Redis: 2.1GB / 8GB used", uptime: "99.99%" },
  { name: "Agent Pool", status: "warning", detail: "5/8 agents online, 3 warming up", uptime: "98.5%" },
];

const roleColors: Record<string, string> = {
  Admin: "bg-violet-500/15 text-violet-400 border border-violet-500/25",
  Analyst: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  Viewer: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
};

interface TestResult {
  success: boolean;
  latency?: number;
  mode?: string;
  catalog?: string;
  schema?: string;
  error?: string;
}

interface SaveResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function AdminContent() {
  const [activeTab, setActiveTab] = useState<TabId>("connection");
  const { dataMode, setDataMode } = useUIStore();

  const [dbConfig, setDbConfig] = useState({
    host: "adb-1234567890.12.azuredatabricks.net",
    token: "dapi********************************",
    httpPath: "/sql/1.0/warehouses/abc123def456",
    catalog: "mars_finsight",
    schema: "prod_analytics",
  });

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected">("connected");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // CR-025: Save state
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // CR-024: Real Databricks test connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/databricks/test-connection?mode=${dataMode}`);
      const data: TestResult = await res.json();
      setTestResult(data);
      setConnectionStatus(data.success ? "connected" : "disconnected");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      setTestResult({ success: false, error: errorMessage });
      setConnectionStatus("disconnected");
    } finally {
      setTesting(false);
    }
  };

  // CR-025: Save connection config
  const handleSave = async () => {
    setSaving(true);
    setSaveToast(null);
    try {
      const res = await fetch("/api/admin/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbConfig),
      });
      const data: SaveResult = await res.json();
      if (data.success) {
        setSaveToast({ type: "success", message: data.message ?? "Configuration saved" });
      } else {
        setSaveToast({ type: "error", message: data.error ?? "Failed to save configuration" });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error";
      setSaveToast({ type: "error", message: errorMessage });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveToast(null), 5000);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">System Administration</h1>

      {/* Save Toast */}
      {saveToast && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            saveToast.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/25 bg-red-500/10 text-red-400"
          }`}
        >
          {saveToast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {saveToast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary bg-muted/30 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Connection Tab */}
      {activeTab === "connection" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Databricks Connection</CardTitle>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2.5 w-2.5 rounded-full ${
                      connectionStatus === "connected" ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium ${
                      connectionStatus === "connected"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {connectionStatus === "connected" ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">Host</label>
                  <Input
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">Token</label>
                  <Input
                    type="password"
                    value={dbConfig.token}
                    onChange={(e) => setDbConfig({ ...dbConfig, token: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-muted-foreground">HTTP Path</label>
                  <Input
                    value={dbConfig.httpPath}
                    onChange={(e) => setDbConfig({ ...dbConfig, httpPath: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Catalog</label>
                  <Input
                    value={dbConfig.catalog}
                    onChange={(e) => setDbConfig({ ...dbConfig, catalog: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Schema</label>
                  <Input
                    value={dbConfig.schema}
                    onChange={(e) => setDbConfig({ ...dbConfig, schema: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                  <TestTube className="h-4 w-4" />
                  {testing ? "Testing..." : "Test Connection"}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>

              {/* CR-024: Test Connection Result */}
              {testResult && (
                <div
                  className={`mt-4 rounded-lg border p-3 ${
                    testResult.success
                      ? "border-emerald-500/25 bg-emerald-500/10"
                      : "border-red-500/25 bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        testResult.success ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {testResult.success ? "Connection Successful" : "Connection Failed"}
                    </span>
                  </div>
                  {testResult.success ? (
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                      {testResult.latency != null && (
                        <>
                          <span className="text-muted-foreground">Latency</span>
                          <span>{testResult.latency}ms</span>
                        </>
                      )}
                      {testResult.mode && (
                        <>
                          <span className="text-muted-foreground">Mode</span>
                          <span className="capitalize">{testResult.mode}</span>
                        </>
                      )}
                      {testResult.catalog && (
                        <>
                          <span className="text-muted-foreground">Catalog</span>
                          <span>{testResult.catalog}</span>
                        </>
                      )}
                      {testResult.schema && (
                        <>
                          <span className="text-muted-foreground">Schema</span>
                          <span>{testResult.schema}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-red-400/80">{testResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex rounded-lg border border-foreground/10">
                  {(["simulated", "real"] as const).map((mode, i) => (
                    <button
                      key={mode}
                      onClick={() => setDataMode(mode)}
                      className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                        i === 0 ? "rounded-l-lg" : "rounded-r-lg"
                      } ${
                        dataMode === mode
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "simulated" ? "Simulated" : "Live"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dataMode === "simulated"
                    ? "Using deterministic simulated data for development and demos."
                    : "Connected to Databricks (corporate_finance_analytics_prod.finsight_core_model)."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <Card>
          <CardHeader>
            <CardTitle>Report Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between rounded-lg border border-foreground/5 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      Last modified: {tpl.lastModified}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* User Management */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>GBU Access</TableHead>
                    <TableHead>Last Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {USERS.map((user) => (
                    <TableRow key={user.email}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-xs">{user.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${
                            roleColors[user.role] ?? ""
                          }`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{user.gbuAccess}</TableCell>
                      <TableCell className="text-xs">{user.lastLogin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* FR7.5: RBAC Roles */}
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control (RBAC)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {RBAC_ROLES.map((r) => (
                    <TableRow key={r.role}>
                      <TableCell>
                        <span className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${roleColors[r.role] ?? "bg-muted text-foreground"}`}>
                          {r.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{r.permissions}</TableCell>
                      <TableCell className="text-right text-xs">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* FR7.2: Org Hierarchy */}
          <Card>
            <CardHeader>
              <CardTitle>Organization Hierarchy</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Examples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORG_HIERARCHY.map((h) => (
                    <TableRow key={h.level}>
                      <TableCell className="font-mono text-xs">{h.level}</TableCell>
                      <TableCell className="font-medium text-xs">{h.name}</TableCell>
                      <TableCell className="text-xs">{h.units}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.examples || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* FR7.3: Peer Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Peer Group Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peer Group</TableHead>
                    <TableHead>Companies</TableHead>
                    <TableHead>Metrics</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PEER_GROUPS.map((pg) => (
                    <TableRow key={pg.id}>
                      <TableCell className="font-medium text-xs">{pg.name}</TableCell>
                      <TableCell className="text-xs">{pg.companies}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{pg.metrics}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Tab */}
      {activeTab === "system" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {SYSTEM_HEALTH.map((item) => (
              <Card key={item.name}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          item.status === "healthy"
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.uptime}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Freshness</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { source: "P&L Actuals", lastUpdate: "2025-06-28 06:00 UTC", frequency: "Daily" },
                  { source: "Replan Data", lastUpdate: "2025-06-15 12:00 UTC", frequency: "Monthly" },
                  { source: "Market Prices", lastUpdate: "2025-06-28 16:30 UTC", frequency: "Real-time" },
                  { source: "Competitor Filings", lastUpdate: "2025-06-25 09:00 UTC", frequency: "Weekly" },
                ].map((item) => (
                  <div
                    key={item.source}
                    className="flex items-center justify-between rounded-lg border border-foreground/5 px-3 py-2"
                  >
                    <span className="text-sm">{item.source}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">{item.lastUpdate}</span>
                      <Badge variant="secondary">{item.frequency}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Hit Rate", value: "94.2%" },
                  { label: "Total Keys", value: "12,847" },
                  { label: "Memory Used", value: "2.1 GB" },
                  { label: "Evictions (24h)", value: "342" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className="text-lg font-semibold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
