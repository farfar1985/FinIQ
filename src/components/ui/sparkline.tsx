import { cn } from "@/lib/utils";

interface SparklineProps extends React.ComponentProps<"svg"> {
  data: number[];
  color?: "auto" | string;
  width?: number;
  height?: number;
}

function Sparkline({
  data,
  color = "auto",
  width = 80,
  height = 24,
  className,
  ...props
}: SparklineProps) {
  if (!data.length || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const resolvedColor =
    color === "auto"
      ? data[data.length - 1] >= data[0]
        ? "oklch(0.75 0.18 145)"
        : "oklch(0.70 0.19 25)"
      : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("inline-block", className)}
      {...props}
    >
      <polyline
        points={points}
        stroke={resolvedColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export { Sparkline };
export type { SparklineProps };
