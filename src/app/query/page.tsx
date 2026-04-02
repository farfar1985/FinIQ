import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";

const QueryContent = dynamic(
  () => import("@/components/query/query-content").then((m) => ({ default: m.QueryContent })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm text-muted-foreground">Loading query interface...</div>
      </div>
    ),
  }
);

export default function QueryPage() {
  return (
    <AppShell>
      <QueryContent />
    </AppShell>
  );
}
