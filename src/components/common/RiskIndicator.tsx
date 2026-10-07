import { AlertOctagon, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function RiskIndicator({
  level,
  label,
  className,
}: {
  level: "low" | "medium" | "high" | "info";
  label: string;
  className?: string;
}) {
  const styles: Record<string, string> = {
    high: "border-danger/50 bg-danger/15 text-danger",
    medium: "border-warning/50 bg-warning/15 text-warning",
    low: "border-info/50 bg-info/15 text-info",
    info: "border-border-strong bg-surface-2 text-fg-muted",
  };
  const Icon = level === "high" ? AlertOctagon : ShieldAlert;
  return (
    <div
      role={level === "high" ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium",
        styles[level],
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
