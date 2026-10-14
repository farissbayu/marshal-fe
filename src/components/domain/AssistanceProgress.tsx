import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "pending";

/**
 * Status stepper for an assistance case: OPEN → (decision) → RESOLVED, with
 * timestamps so the operator knows which step the case is on.
 */
export function AssistanceProgress({
  status,
  openedAt,
  resolvedAt,
}: {
  status: "OPEN" | "ESCALATED" | "RESOLVED";
  openedAt: string;
  resolvedAt?: string | null;
}) {
  const resolved = status === "RESOLVED";
  const waiting = status === "ESCALATED" ? "menunggu supervisor lapangan" : "menunggu supervisor";
  const steps: Array<{ label: string; time: string; state: StepState }> = [
    { label: "OPEN", time: formatDateTime(openedAt), state: "done" },
    {
      label: status === "ESCALATED" ? "ESKALASI" : "KEPUTUSAN",
      time: resolved ? formatDateTime(resolvedAt ?? "") : waiting,
      state: resolved ? "done" : "active",
    },
    {
      label: "RESOLVED",
      time: resolved ? formatDateTime(resolvedAt ?? "") : "belum selesai",
      state: resolved ? "done" : "pending",
    },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-y-2" aria-label="Progres case assistance">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center">
          {index > 0 && <span className="mx-2 h-px w-6 bg-border sm:mx-3 sm:w-10" aria-hidden />}
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                step.state === "done" && "border-success/50 bg-success/15 text-success",
                step.state === "active" && "border-warning/50 bg-warning/15 text-warning",
                step.state === "pending" && "border-border bg-surface-2 text-fg-subtle",
              )}
            >
              {step.state === "done" ? <Check className="size-3" aria-hidden /> : index + 1}
            </span>
            <span className="leading-tight">
              <span
                className={cn(
                  "block text-xs font-medium",
                  step.state === "pending" ? "text-fg-subtle" : "text-fg",
                )}
              >
                {step.label}
              </span>
              <span className="block text-[10px] text-fg-subtle">{step.time}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
