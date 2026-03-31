import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChangeBadgeProps extends Omit<React.ComponentProps<"span">, "children"> {
  value: number;
  format?: "percent" | "currency" | "number";
}

function formatValue(value: number, format: "percent" | "currency" | "number"): string {
  const abs = Math.abs(value);
  switch (format) {
    case "percent":
      return `${abs.toFixed(2)}%`;
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(abs);
    case "number":
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(abs);
  }
}

function ChangeBadge({ value, format = "percent", className, ...props }: ChangeBadgeProps) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        isPositive
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400",
        className
      )}
      {...props}
    >
      <Icon className="size-3" />
      {isPositive ? "+" : "-"}
      {formatValue(value, format)}
    </span>
  );
}

export { ChangeBadge };
export type { ChangeBadgeProps };
