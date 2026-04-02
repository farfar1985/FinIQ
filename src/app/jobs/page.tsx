import dynamic from "next/dynamic";
import { AppShell } from "@/components/app-shell";

const JobsContent = dynamic(
  () => import("@/components/jobs/jobs-content").then((m) => ({ default: m.JobsContent })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm text-muted-foreground">Loading job board...</div>
      </div>
    ),
  }
);

export default function JobsPage() {
  return (
    <AppShell>
      <JobsContent />
    </AppShell>
  );
}
