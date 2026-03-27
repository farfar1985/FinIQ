export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Admin Panel</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { title: "Databricks Connection", description: "Configure data source, test connection, toggle fallback mode" },
          { title: "Template Management", description: "Visual editor for report templates with versioning" },
          { title: "Org Hierarchy", description: "Manage organizational units and hierarchy levels" },
          { title: "RBAC & Users", description: "Role-based access control with org unit scoping" },
          { title: "Prompt Management", description: "Configure and manage suggested prompts" },
          { title: "Peer Groups", description: "Configure competitor peer groups for CI benchmarking" },
        ].map((section) => (
          <div
            key={section.title}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h3 className="text-sm font-medium">{section.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {section.description}
            </p>
            <div className="mt-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                Coming in Batch 6
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
