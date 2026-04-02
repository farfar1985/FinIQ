import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";

const ReportsContent = dynamic(
  () => import("@/components/reports/reports-content").then((m) => ({ default: m.ReportsContent })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm text-muted-foreground">Loading reports...</div>
      </div>
    ),
  }
);

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsContent />
    </AppShell>
  );
}
