import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center justify-center h-5 rounded-4xl px-2 text-xs font-medium whitespace-nowrap transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive text-destructive-foreground",
        outline:
          "border border-current bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

const statusColorMap: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  inactive: "bg-zinc-500/15 text-zinc-400 border border-zinc-500/25",
  pending: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  error: "bg-red-500/15 text-red-400 border border-red-500/25",
  warning: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};

function StatusBadge({
  status,
  className,
  ...props
}: React.ComponentProps<"span"> & { status: string }) {
  const colorClasses = statusColorMap[status.toLowerCase()] ?? statusColorMap.inactive;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 rounded-4xl px-2 text-xs font-medium whitespace-nowrap",
        colorClasses,
        className
      )}
      {...props}
    >
      {props.children ?? status}
    </span>
  );
}

const severityColorMap: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border border-red-500/25",
  high: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  low: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
  info: "bg-sky-500/15 text-sky-400 border border-sky-500/25",
};

function SeverityBadge({
  severity,
  className,
  ...props
}: React.ComponentProps<"span"> & { severity: string }) {
  const colorClasses = severityColorMap[severity.toLowerCase()] ?? severityColorMap.info;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 rounded-4xl px-2 text-xs font-medium whitespace-nowrap",
        colorClasses,
        className
      )}
      {...props}
    >
      {props.children ?? severity}
    </span>
  );
}

export { Badge, badgeVariants, StatusBadge, SeverityBadge };
