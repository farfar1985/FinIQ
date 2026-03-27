export default function CIPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-base font-medium">Competitive Intelligence</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[
          { title: "SWOT Analysis", description: "Auto-generated quarterly from FMP ratios + earnings sentiment" },
          { title: "Porter's Five Forces", description: "Quantified via HHI from market cap, supplier/buyer power" },
          { title: "Earnings Call Intelligence", description: "NLP on transcripts: sentiment, keywords, tone" },
          { title: "Financial Benchmarking", description: "Side-by-side comparison across competitor universe" },
          { title: "Competitive Positioning", description: "2D scatter plot on selectable dimensions" },
          { title: "M&A Tracker", description: "Timeline of competitor transactions" },
        ].map((view) => (
          <div
            key={view.title}
            className="rounded-lg border border-border bg-card p-4"
          >
            <h3 className="text-sm font-medium">{view.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {view.description}
            </p>
            <div className="mt-3">
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                Coming in Batch 7
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
