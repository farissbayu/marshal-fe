import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const toneClass: Record<string, string> = {
  default: "text-fg",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
};

export interface KpiCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "flat";
  tone?: "default" | "success" | "warning" | "danger" | "info";
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  tone = "default",
  hint,
  loading,
  onClick,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-2 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-16" />
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card
      className={cn(onClick && "cursor-pointer transition-colors hover:border-border-strong")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className={cn("font-mono text-2xl font-semibold tabular", toneClass[tone])}>
            {value}
          </span>
          {unit && <span className="text-xs text-fg-subtle">{unit}</span>}
          {trend && <TrendIcon className="ml-auto size-4 text-fg-subtle" aria-hidden />}
        </div>
        {hint && <p className="mt-1 text-[11px] text-fg-subtle">{hint}</p>}
      </CardContent>
    </Card>
  );
}
