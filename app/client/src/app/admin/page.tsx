"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

// ============================================================
// Types
// ============================================================

interface ConnectionConfig {
  dataMode: string;
  activeMode: string;
  sqlitePath: string;
  databricks: {
    serverHostname: string;
    httpPath: string;
    token: string;
    catalog: string;
    schema: string;
  };
  anthropicConfigured: boolean;
  fmpConfigured: boolean;
}

interface ConnectionTestResult {
  connected: boolean;
  latency: number;
  mode: string;
  entityCount?: number;
  message: string;
}

interface OrgNode {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  level: number;
  children: OrgNode[];
}

interface OrgTreeResponse {
  totalEntities: number;
  rootCount: number;
  tree: OrgNode[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Prompt {
  id: string;
  suggested_prompt: string;
  description: string;
  kpi: string[];
  tag: string;
  unit: string;
  category: string;
  runs: number;
  is_active: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PeerGroup {
  id: string;
  name: string;
  description: string;
  segment: string;
  competitors: { name: string; ticker: string; included: boolean }[];
  metrics: string[];
  is_active: boolean;
}

interface IngestionTable {
  name: string;
  rows: number | null;
  status: string;
}

interface IngestionStatus {
  mode: string;
  connected: boolean;
  lastRefresh: string;
  tables: IngestionTable[];
  totalDimensionRows: number;
  error?: string;
}

// ============================================================
// Tab definitions
// ============================================================

const TABS = [
  { id: "connection", label: "Connection" },
  { id: "organization", label: "Organization" },
  { id: "rbac", label: "RBAC" },
  { id: "prompts", label: "Prompts" },
  { id: "templates", label: "Templates" },
  { id: "peergroups", label: "Peer Groups" },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ============================================================
// Category colors
// ============================================================

const CATEGORY_COLORS: Record<string, string> = {
  bridge: "bg-chart-1/15 text-chart-1",
  margin: "bg-chart-2/15 text-chart-2",
  revenue: "bg-chart-3/15 text-chart-3",
  narrative: "bg-chart-4/15 text-chart-4",
  cost: "bg-chart-5/15 text-chart-5",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-negative/15 text-negative",
  analyst: "bg-primary/15 text-primary",
  viewer: "bg-positive/15 text-positive",
  api_consumer: "bg-warning/15 text-warning",
};

// ============================================================
// Main component
// ============================================================

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("connection");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-medium">Admin Panel</h1>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          FR7.1-7.6
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "connection" && <ConnectionTab />}
      {activeTab === "organization" && <OrganizationTab />}
      {activeTab === "rbac" && <RBACTab />}
      {activeTab === "prompts" && <PromptsTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "peergroups" && <PeerGroupsTab />}
    </div>
  );
}

// ============================================================
// Connection Tab (FR7.6)
// ============================================================

function ConnectionTab() {
  const [config, setConfig] = useState<ConnectionConfig | null>(null);
  const [ingestion, setIngestion] = useState<IngestionStatus | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfgRes, ingRes] = await Promise.all([
        api.get<ConnectionConfig>("/admin/config"),
        api.get<IngestionStatus>("/admin/ingestion/status"),
      ]);
      setConfig(cfgRes);
      setIngestion(ingRes);
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post<ConnectionTestResult>("/admin/config/test", {});
      setTestResult(result);
    } catch (err) {
      setTestResult({
        connected: false,
        latency: 0,
        mode: "none",
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Data Mode Card */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Data Connection</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Current data source configuration</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                config?.activeMode === "databricks"
                  ? "bg-positive/15 text-positive"
                  : "bg-warning/15 text-warning"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  config?.activeMode === "databricks" ? "bg-positive" : "bg-warning"
                }`}
              />
              {config?.activeMode === "databricks" ? "Databricks" : "SQLite (Simulated)"}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ConfigField label="Configured Mode" value={config?.dataMode || "unknown"} />
          <ConfigField label="Active Mode" value={config?.activeMode || "unknown"} />
          <ConfigField label="SQLite Path" value={config?.sqlitePath || "not set"} mono />
          <ConfigField
            label="Databricks Host"
            value={config?.databricks.serverHostname || "not configured"}
            mono
          />
          <ConfigField
            label="HTTP Path"
            value={config?.databricks.httpPath || "not configured"}
            mono
          />
          <ConfigField label="Token" value={config?.databricks.token || "not set"} mono />
          <ConfigField label="Catalog" value={config?.databricks.catalog || "workspace"} />
          <ConfigField label="Schema" value={config?.databricks.schema || "default"} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <ConfigIndicator label="Anthropic API" active={config?.anthropicConfigured ?? false} />
          <ConfigIndicator label="FMP API" active={config?.fmpConfigured ?? false} />
        </div>

        {/* Test connection button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          {testResult && (
            <span
              className={`text-xs ${testResult.connected ? "text-positive" : "text-negative"}`}
            >
              {testResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Ingestion Status */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Ingestion Status (FR1.5)</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Data table row counts and load status
        </p>

        {ingestion && (
          <>
            <div className="mt-3 flex items-center gap-4 text-xs">
              <span className="text-muted-foreground">
                Total dimension rows:{" "}
                <span className="font-mono text-foreground">
                  {ingestion.totalDimensionRows.toLocaleString()}
                </span>
              </span>
              <span className="text-muted-foreground">
                Last refresh:{" "}
                <span className="font-mono text-foreground">
                  {new Date(ingestion.lastRefresh).toLocaleTimeString()}
                </span>
              </span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Table</th>
                    <th className="pb-2 pr-4 font-medium text-right">Rows</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ingestion.tables.map((table) => (
                    <tr key={table.name} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-foreground">{table.name}</td>
                      <td className="py-2 pr-4 text-right font-mono">
                        {table.rows !== null ? table.rows.toLocaleString() : "--"}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            table.status === "loaded"
                              ? "bg-positive/15 text-positive"
                              : table.status === "view"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {table.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ConfigField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <div
        className={`mt-0.5 truncate rounded bg-muted/50 px-2 py-1 text-xs ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function ConfigIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${active ? "bg-positive" : "bg-muted-foreground/30"}`}
      />
      {label}: {active ? "Configured" : "Not set"}
    </span>
  );
}

// ============================================================
// Organization Tab (FR7.2)
// ============================================================

function OrganizationTab() {
  const [orgTree, setOrgTree] = useState<OrgTreeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    api
      .get<OrgTreeResponse>("/admin/org-tree")
      .then(setOrgTree)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const filteredTree = searchTerm
    ? filterTree(orgTree?.tree || [], searchTerm.toLowerCase())
    : orgTree?.tree || [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Entity Hierarchy</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {orgTree?.totalEntities} entities, {orgTree?.rootCount} top-level
            </p>
          </div>
          <input
            type="text"
            placeholder="Search entities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mt-4 max-h-[500px] overflow-y-auto">
          {filteredTree.map((node) => (
            <TreeNode key={node.id} node={node} depth={0} />
          ))}
          {filteredTree.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No entities match the search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, depth }: { node: OrgNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex cursor-pointer items-center gap-1.5 rounded px-1 py-1 text-xs hover:bg-muted/50"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
            {expanded ? "\u25BE" : "\u25B8"}
          </span>
        ) : (
          <span className="h-4 w-4" />
        )}
        <span className="font-mono text-[10px] text-muted-foreground">{node.id}</span>
        <span className="text-foreground">{node.name}</span>
        <span className="rounded-full bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
          L{node.level}
        </span>
        {hasChildren && (
          <span className="text-[10px] text-muted-foreground">({node.children.length})</span>
        )}
      </div>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}

function filterTree(nodes: OrgNode[], term: string): OrgNode[] {
  const result: OrgNode[] = [];
  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(term);
    const idMatch = node.id.toLowerCase().includes(term);
    const filteredChildren = filterTree(node.children, term);
    if (nameMatch || idMatch || filteredChildren.length > 0) {
      result.push({
        ...node,
        children: nameMatch || idMatch ? node.children : filteredChildren,
      });
    }
  }
  return result;
}

// ============================================================
// RBAC Tab (FR7.5)
// ============================================================

function RBACTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ users: User[] }>("/admin/users"),
      api.get<{ roles: Role[] }>("/admin/roles"),
    ])
      .then(([uRes, rRes]) => {
        setUsers(uRes.users);
        setRoles(rRes.roles);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await api.post<{ user: User }>(`/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? res.user : u)));
    } catch (err) {
      console.error("Failed to assign role:", err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Users & Role Assignments</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {users.length} users across {roles.length} roles
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">{user.name}</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">{user.email}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] focus:border-primary focus:outline-none"
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles Reference */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Role Definitions</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Click a role to view its permissions
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(selectedRole?.id === role.id ? null : role)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selectedRole?.id === role.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    ROLE_COLORS[role.id] || "bg-muted text-muted-foreground"
                  }`}
                >
                  {role.name}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{role.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {role.permissions.length} permissions
              </p>
            </button>
          ))}
        </div>

        {selectedRole && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <h4 className="text-xs font-medium text-primary">
              {selectedRole.name} Permissions
            </h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedRole.permissions.map((perm) => (
                <span
                  key={perm}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Prompts Tab (FR7.4)
// ============================================================

function PromptsTab() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  useEffect(() => {
    api
      .get<{ prompts: Prompt[] }>("/admin/prompts")
      .then((res) => setPrompts(res.prompts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await api.post<{ prompt: Prompt }>(`/admin/prompts/${id}/toggle`, {});
      setPrompts((prev) => prev.map((p) => (p.id === id ? res.prompt : p)));
    } catch (err) {
      console.error("Failed to toggle prompt:", err);
    }
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.suggested_prompt);
  };

  const handleSave = async (id: string) => {
    try {
      await api.get<{ prompt: Prompt }>(`/admin/prompts/${id}`); // will use PATCH
      const patchRes = await fetch(`/api/admin/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggested_prompt: editText }),
      });
      if (!patchRes.ok) throw new Error("Failed to save");
      const data = await patchRes.json();
      setPrompts((prev) => prev.map((p) => (p.id === id ? data.prompt : p)));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save prompt:", err);
    }
  };

  if (loading) return <LoadingSpinner />;

  const categories = [...new Set(prompts.map((p) => p.category))];
  const filtered = filterCategory
    ? prompts.filter((p) => p.category === filterCategory)
    : prompts;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Suggested Prompt Library</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {prompts.length} prompts, {prompts.filter((p) => p.is_active).length} active
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {filtered.map((prompt) => (
            <div
              key={prompt.id}
              className={`rounded-lg border p-3 transition-colors ${
                prompt.is_active ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {prompt.id}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0 text-[10px] font-medium ${
                        CATEGORY_COLORS[prompt.category] || "bg-muted text-muted-foreground"
                      }`}
                    >
                      {prompt.category}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
                      {prompt.tag}
                    </span>
                  </div>

                  {editingId === prompt.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 rounded border border-primary bg-background px-2 py-1 font-mono text-xs focus:outline-none"
                      />
                      <button
                        onClick={() => handleSave(prompt.id)}
                        className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 font-mono text-xs text-foreground">
                      {prompt.suggested_prompt}
                    </p>
                  )}

                  <p className="mt-1 text-[11px] text-muted-foreground">{prompt.description}</p>

                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {prompt.kpi.map((k) => (
                      <span
                        key={k}
                        className="rounded bg-muted/80 px-1.5 py-0 text-[9px] text-muted-foreground"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {editingId !== prompt.id && (
                    <button
                      onClick={() => handleEdit(prompt)}
                      className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(prompt.id)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      prompt.is_active ? "bg-positive" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        prompt.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Templates Tab (FR7.1)
// ============================================================

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("pes");

  useEffect(() => {
    api
      .get<{ templates: Template[] }>("/admin/templates")
      .then((res) => setTemplates(res.templates))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDesc, type: newType, config: {} }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      const data = await res.json();
      setTemplates((prev) => [...prev, data.template]);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewType("pes");
    } catch (err) {
      console.error("Failed to create template:", err);
    }
  };

  const handleSave = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const data = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle template");
      const data = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)));
    } catch (err) {
      console.error("Failed to toggle template:", err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Report Templates</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {templates.length} templates define which KPIs, columns, and formats reports use
            </p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {showCreate ? "Cancel" : "New Template"}
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <h4 className="text-xs font-medium text-primary">Create Template</h4>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <input
                placeholder="Template name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <input
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="rounded border border-border bg-background px-2 py-1.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                >
                  <option value="pes">PES</option>
                  <option value="variance">Variance</option>
                  <option value="ci">CI</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Template list */}
        <div className="mt-3 space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`rounded-lg border p-3 transition-colors ${
                template.is_active ? "border-border" : "border-border/50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingId === template.id ? (
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-primary bg-background px-2 py-1 text-xs font-medium focus:outline-none"
                      />
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(template.id)}
                          className="rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {template.name}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0 text-[10px] font-medium text-primary">
                          {template.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">v{template.version}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {template.description}
                      </p>

                      {/* Show config KPIs */}
                      {template.config && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(
                            (template.config as { kpis?: string[] }).kpis || []
                          ).map((kpi: string) => (
                            <span
                              key={kpi}
                              className="rounded bg-muted/80 px-1.5 py-0 text-[9px] text-muted-foreground"
                            >
                              {kpi}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  {editingId !== template.id && (
                    <button
                      onClick={() => {
                        setEditingId(template.id);
                        setEditName(template.name);
                        setEditDesc(template.description);
                      }}
                      className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleToggle(template.id, template.is_active)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      template.is_active ? "bg-positive" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                        template.is_active ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Peer Groups Tab (FR7.3)
// ============================================================

function PeerGroupsTab() {
  const [peerGroups, setPeerGroups] = useState<PeerGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ peerGroups: PeerGroup[] }>("/admin/peer-groups")
      .then((res) => setPeerGroups(res.peerGroups))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggleCompetitor = async (
    groupId: string,
    competitorIndex: number
  ) => {
    const group = peerGroups.find((g) => g.id === groupId);
    if (!group) return;

    const updated = [...group.competitors];
    updated[competitorIndex] = {
      ...updated[competitorIndex],
      included: !updated[competitorIndex].included,
    };

    try {
      const res = await fetch(`/api/admin/peer-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors: updated }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setPeerGroups((prev) => prev.map((g) => (g.id === groupId ? data.peerGroup : g)));
    } catch (err) {
      console.error("Failed to update peer group:", err);
    }
  };

  const handleToggleActive = async (groupId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/peer-groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle");
      const data = await res.json();
      setPeerGroups((prev) => prev.map((g) => (g.id === groupId ? data.peerGroup : g)));
    } catch (err) {
      console.error("Failed to toggle peer group:", err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {peerGroups.map((group) => (
        <div
          key={group.id}
          className={`rounded-lg border p-4 transition-colors ${
            group.is_active ? "border-border bg-card" : "border-border/50 bg-card opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{group.name}</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0 text-[10px] font-medium text-primary">
                  {group.segment}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
            </div>
            <button
              onClick={() => handleToggleActive(group.id, group.is_active)}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                group.is_active ? "bg-positive" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  group.is_active ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Competitors */}
          <div className="mt-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Competitors
            </span>
            <div className="mt-1.5 space-y-1">
              {group.competitors.map((comp, idx) => (
                <div
                  key={comp.name}
                  className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleCompetitor(group.id, idx)}
                      className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                        comp.included
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {comp.included && "\u2713"}
                    </button>
                    <span
                      className={`text-xs ${
                        comp.included ? "text-foreground" : "text-muted-foreground line-through"
                      }`}
                    >
                      {comp.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {comp.ticker}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Benchmarking Metrics
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.metrics.map((metric) => (
                <span
                  key={metric}
                  className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground"
                >
                  {metric}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Shared components
// ============================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
