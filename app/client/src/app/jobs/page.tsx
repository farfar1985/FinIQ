export default function JobsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Job Board</h1>

      {/* Status summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Active", count: 0, color: "text-primary" },
          { label: "Queued", count: 0, color: "text-warning" },
          { label: "Completed", count: 0, color: "text-positive" },
          { label: "Failed", count: 0, color: "text-negative" },
        ].map((status) => (
          <div
            key={status.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {status.label}
            </span>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${status.color}`}>
              {status.count}
            </div>
          </div>
        ))}
      </div>

      {/* Jobs table placeholder */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Enterprise job dashboard with filters will appear here after Batch 5.
        </div>
      </div>
    </div>
  );
}
