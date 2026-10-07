import { Pause, Play, Trash2, Zap } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { FlowBadge } from "@/components/common/FlowBadge";
import { Button } from "@/components/ui/button";
import { FLOWS } from "@/lib/flows";
import { formatClock } from "@/lib/format";
import { EVENT_BUFFER_LIMIT, useEventLogStore } from "@/lib/stores/event-log";
import { cn } from "@/lib/utils";

const LEVEL_CLASS: Record<string, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-danger",
  info: "text-fg-muted",
};

export function LiveActivityFeed({ className }: { className?: string }) {
  const events = useEventLogStore((s) => s.events);
  const activeFlowFilter = useEventLogStore((s) => s.activeFlowFilter);
  const isPaused = useEventLogStore((s) => s.isPaused);
  const setFlowFilter = useEventLogStore((s) => s.setFlowFilter);
  const togglePaused = useEventLogStore((s) => s.togglePaused);
  const clear = useEventLogStore((s) => s.clear);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (activeFlowFilter ? events.filter((e) => e.flow === activeFlowFilter) : events),
    [events, activeFlowFilter],
  );

  useEffect(() => {
    if (isPaused) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [filtered, isPaused]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-fg-muted" aria-hidden />
          <span className="text-sm font-medium text-fg">Live Flow Activity</span>
          <span className="font-mono text-[10px] text-fg-subtle">
            {filtered.length}/{EVENT_BUFFER_LIMIT}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={isPaused ? "Lanjutkan auto-scroll" : "Jeda auto-scroll"}
            onClick={togglePaused}
          >
            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Bersihkan feed" onClick={clear}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
        <FlowPill
          active={activeFlowFilter === null}
          onClick={() => setFlowFilter(null)}
          label="All Flows"
        />
        {FLOWS.map((flow) => (
          <FlowPill
            key={flow.id}
            active={activeFlowFilter === flow.id}
            onClick={() => setFlowFilter(flow.id)}
            label={`${flow.code}: ${flow.short}`}
            title={`${flow.label} — ${flow.description}`}
          />
        ))}
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2"
        role="log"
        aria-live={isPaused ? "off" : "polite"}
        aria-label="Log aktivitas flow"
      >
        {filtered.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-fg-subtle">
            Menunggu event masuk dari stream…
          </p>
        ) : (
          filtered.map((event) => (
            <div
              key={event.seq}
              className="flex items-start gap-2 rounded px-2 py-1 text-xs hover:bg-surface-2"
            >
              <span className="tabular shrink-0 pt-0.5 text-fg-subtle">
                {formatClock(event.at)}
              </span>
              <FlowBadge flow={event.flow} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className={cn("font-medium", LEVEL_CLASS[event.level] ?? "text-fg-muted")}>
                  {event.title}
                </p>
                <p className="truncate text-fg-muted" title={event.detail}>
                  {event.detail}
                </p>
              </div>
              <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-fg-subtle sm:block">
                {event.source}
              </span>
            </div>
          ))
        )}
      </div>

      {isPaused && (
        <div className="border-t border-warning/40 bg-warning/10 px-3 py-1 text-[10px] text-warning">
          Auto-scroll dijeda — event baru tetap masuk (buffer maks {EVENT_BUFFER_LIMIT}).
        </div>
      )}
    </div>
  );
}

function FlowPill({
  active,
  label,
  onClick,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border bg-surface-2 text-fg-muted hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
