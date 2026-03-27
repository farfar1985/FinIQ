export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Financial Reports</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Period End Summary",
            description: "AI-generated executive performance summaries with 6 KPIs",
            status: "Batch 3",
          },
          {
            title: "Budget Variance",
            description: "Actual vs Replan analysis with favorable/unfavorable indicators",
            status: "Batch 3",
          },
          {
            title: "Custom Report Builder",
            description: "Select KPIs, units, periods, and comparison bases",
            status: "Batch 3",
          },
        ].map((report) => (
          <div
            key={report.title}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h3 className="text-sm font-medium">{report.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.description}
            </p>
            <div className="mt-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                Coming in {report.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
