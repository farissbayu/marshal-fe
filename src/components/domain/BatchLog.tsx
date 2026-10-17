import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BatchEvent } from "@/lib/schemas";
import { severityVariant } from "@/lib/status";

export function BatchLog({ events }: { events: BatchEvent[] }) {
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const shown = events
    .filter((event) => !exceptionsOnly || event.level === "warn" || event.level === "bad")
    .slice(-200)
    .reverse();
  return (
    <section aria-label="Batch event log">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-fg">Batch log</h3>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          aria-pressed={exceptionsOnly}
          onClick={() => setExceptionsOnly((value) => !value)}
        >
          {exceptionsOnly ? "All events" : "Exceptions"}
        </Button>
      </div>
      <ol className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-3">
        {shown.map((event) => (
          <li
            key={event.seq}
            className="flex items-start gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            <time className="shrink-0 font-mono text-[10px] text-fg-subtle">
              {new Date(event.at).toLocaleTimeString()}
            </time>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {event.flow != null && <Badge variant="neutral">Flow {event.flow}</Badge>}
                <Badge variant={severityVariant(event.level)}>{event.source}</Badge>
                <strong className="text-[11px] text-fg">{event.title}</strong>
              </div>
              {event.detail && (
                <p className="mt-1 break-words text-[11px] text-fg-muted">{event.detail}</p>
              )}
            </div>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="text-xs text-fg-subtle">Waiting for the batch to start…</li>
        )}
      </ol>
    </section>
  );
}
