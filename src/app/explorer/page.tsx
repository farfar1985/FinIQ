import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";

const ExplorerContent = dynamic(
  () => import("@/components/explorer/explorer-content").then((m) => ({ default: m.ExplorerContent })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm text-muted-foreground">Loading data explorer...</div>
      </div>
    ),
  }
);

export default function ExplorerPage() {
  return (
    <AppShell>
      <ExplorerContent />
    </AppShell>
  );
}
