import { Download } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { BatchReport } from "@/lib/schemas";

function download(report: BatchReport) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.batch_id}-report.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BatchReportCard({ report }: { report: BatchReport }) {
  const counts = report.counts;
  const labels = report.labels;
  return (
    <Card className="p-4" aria-live="polite">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">Batch report · {report.batch_id}</h3>
          <p className="mt-1 text-[11px] text-fg-muted">
            {report.engine} · {report.batch_size} cars ·{" "}
            {report.duration_s == null
              ? "duration unavailable"
              : `${Math.round(report.duration_s / 60)} min`}
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={() => download(report)}>
          <Download aria-hidden /> Download JSON
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        <span>Requested {String(counts.requested ?? 0)}</span>
        <span>Created {String(counts.created ?? 0)}</span>
        <span>Finished {String(counts.finished ?? 0)}</span>
        <span>Shipped {String(counts.shipped ?? 0)}</span>
        <span>Rework {String(counts.rework ?? 0)}</span>
        <span className="font-medium text-fg">
          Caught {labels.caught} · missed {labels.missed} · false alarms {labels.false_alarms}
        </span>
        <StatusBadge status={report.gemini.risk} />
        {report.gemini.degraded && (
          <span className="rounded bg-warning/15 px-2 py-1 text-warning">
            Gemini unavailable, generated from metrics
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-fg">{report.gemini.summary}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {report.gemini.per_flow.map((flow) => (
          <div key={flow.flow} className="rounded-md border border-border p-3">
            <h4 className="text-xs font-semibold text-fg">
              Flow {flow.flow} · {flow.name}
            </h4>
            <p className="mt-1 text-xs text-fg-muted">
              {flow.observation || "No observation recorded."}
            </p>
            {flow.issues.map((issue) => (
              <p key={issue} className="mt-1 text-xs text-danger">
                {issue}
              </p>
            ))}
            {flow.recommendation && (
              <p className="mt-1 text-xs text-info">Recommendation: {flow.recommendation}</p>
            )}
          </div>
        ))}
      </div>
      {report.gemini.top_issues.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-fg">Top issues</h4>
          <ul className="mt-1 list-disc pl-5 text-xs text-fg-muted">
            {report.gemini.top_issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      {report.gemini.recommendations.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-fg">Recommendations</h4>
          <ul className="mt-1 list-disc pl-5 text-xs text-fg-muted">
            {report.gemini.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
