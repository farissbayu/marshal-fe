import { FLOW_COLORS, flowMeta } from "@/lib/flows";
import { cn } from "@/lib/utils";

export function FlowBadge({ flow, className }: { flow: number; className?: string }) {
  const meta = flowMeta(flow);
  return (
    <span
      title={`${meta.label} — ${meta.description}`}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
        FLOW_COLORS[flow] ?? "border-border bg-surface-2 text-fg-muted",
        className,
      )}
    >
      {meta.code}
    </span>
  );
}
