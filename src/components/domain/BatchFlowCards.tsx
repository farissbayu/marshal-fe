import { Card } from "@/components/ui/card";
import type { BatchFlowCounts } from "@/lib/schemas";

const FLOWS = [
  { key: "flow1", title: "1 · Yard", values: ["released", "waiting", "in_yard", "shipped"] },
  { key: "flow2", title: "2 · Assistance", values: ["cases", "open", "resolved"] },
  { key: "flow3", title: "3 · Visual", values: ["pass", "review", "fail"] },
  { key: "flow4", title: "4 · Functional", values: ["pass", "fail", "disagreements"] },
  { key: "flow5", title: "5 · Report", values: ["pass", "rework", "shipped"] },
  { key: "flow6", title: "6 · Scenario", values: ["generated"] },
  { key: "flow7", title: "7 · Adversarial", values: ["runs", "failures"] },
] as const;

const TONE: Record<string, string> = {
  pass: "text-success",
  review: "text-warning",
  fail: "text-danger",
  disagreements: "text-danger",
  failures: "text-danger",
  shipped: "text-success",
};

function titleCase(value: string) {
  return value.replaceAll("_", " ");
}

export function BatchFlowCards({ counts }: { counts: BatchFlowCounts }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {FLOWS.map(({ key, title, values }) => {
        const flow = counts[key as keyof BatchFlowCounts] as unknown as Record<
          string,
          string | number
        >;
        const notTriggered =
          (key === "flow6" || key === "flow7") && flow.status === "not_triggered";
        return (
          <Card key={key} className="p-3">
            <h3 className="text-xs font-semibold text-fg">{title}</h3>
            {notTriggered ? (
              <p className="mt-2 text-[11px] text-fg-subtle">Not triggered (no incident)</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {values.map((name) => (
                  <span key={name} className={`text-[11px] ${TONE[name] ?? "text-fg-muted"}`}>
                    {titleCase(name)} <strong className="font-mono">{flow[name] ?? 0}</strong>
                  </span>
                ))}
                {(key === "flow6" || key === "flow7") && typeof flow.status === "string" && (
                  <span className="w-full text-[10px] text-fg-subtle">
                    {titleCase(flow.status)}
                  </span>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
