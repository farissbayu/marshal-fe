import { Badge } from "@/components/ui/badge";
import { carStateMeta, statusMeta } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge variant={meta.variant} className={cn("font-mono uppercase", className)}>
      {meta.icon && <span aria-hidden>{meta.icon}</span>}
      {meta.label}
    </Badge>
  );
}

export function VehicleStatusBadge({ state, className }: { state: string; className?: string }) {
  const meta = carStateMeta(state);
  return (
    <Badge variant={meta.variant} className={cn(className)}>
      {meta.label}
    </Badge>
  );
}

export function InspectionVerdictBadge({
  verdict,
  className,
}: {
  verdict: "PASS" | "REVIEW" | "FAIL";
  className?: string;
}) {
  return <StatusBadge status={verdict} className={className} />;
}
