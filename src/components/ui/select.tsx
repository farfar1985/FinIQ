import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-8 w-full appearance-none rounded-lg border border-input bg-transparent py-1 pl-3 pr-8 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function SelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option className={cn("bg-popover text-popover-foreground", className)} {...props} />;
}

export { Select, SelectOption };
