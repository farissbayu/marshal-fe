import { createFileRoute } from "@tanstack/react-router";
import { CircleAlert, Play } from "lucide-react";
import { type ReactNode, useState } from "react";
import { BatchPanel } from "@/components/domain/BatchPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clock, feedRows } from "@/lib/feed-rows";
import { useEventLogStore } from "@/lib/stores/event-log";
import { useEventStream } from "@/lib/use-event-stream";
import { type PlantControls, usePlant } from "@/lib/use-plant";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

/* ------------------------------ sample data ------------------------------ */

const STATS = [
  { label: "Off the line", value: "40", sub: "/ of 120 in the window" },
  { label: "Decisions made", value: "160", sub: "✓ 123 by Gemini · 39 by yard rules" },
  { label: "Needed you", value: "2", sub: "19.7% handed without you" },
  { label: "In the yard", value: "25", sub: "20 of 80 slots taken or reserved" },
  { label: "Shipped", value: "10", sub: "5 trucks gone" },
  { label: "Rework", value: "2", sub: "found at the gate" },
];

interface LaneStat {
  label: string;
  value: string;
  sub?: string;
  pill?: { text: string; tone: string };
}

const LANES: LaneStat[] = [
  { label: "At the gate", value: "1" },
  { label: "Driving to a slot", value: "1" },
  { label: "Waiting on you", value: "1", pill: { text: "P038", tone: "amber" } },
  { label: "Rework bay", value: "2", sub: "PO38, PO31" },
];

const TRUCKS = [
  { id: "T-1", status: "Left", time: "06:29" },
  { id: "T-2", status: "Dock", time: "06:40" },
  { id: "T-3", status: "Left", time: "06:55" },
  { id: "T-4", status: "Left", time: "07:16" },
  { id: "T-5", status: "Dock", time: "07:23" },
  { id: "T-6", status: "Left", time: "07:40" },
  { id: "T-7", status: "Left", time: "07:53" },
];

const TIMELINE = [
  { time: "06:16", tags: [{ text: "Yard rules", tone: "violet" }], text: "P017 assigned to B6." },
  {
    time: "06:15",
    tags: [{ text: "Gemini", tone: "blue" }],
    text: "P017 PASSED; passed after review.",
  },
  {
    time: "06:15",
    tags: [{ text: "Rework", tone: "rose" }],
    text: "P017: rear bumper unsecure (0.511). Asking a person.",
  },
];

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const COLS = Array.from({ length: 10 }, (_, i) => i + 1);
const OCCUPIED = new Set([
  ...COLS.map((c) => `A${c}`),
  ...Array.from({ length: 6 }, (_, i) => `B${i + 1}`),
  ...Array.from({ length: 5 }, (_, i) => `C${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `D${i + 1}`),
  ...Array.from({ length: 2 }, (_, i) => `E${i + 1}`),
  "F1",
]);

type SlotState = "empty" | "parked" | "onway" | "justparked" | "needs";

const SLOT_OVERRIDE: Record<string, SlotState> = {
  B7: "needs",
  G3: "onway",
  F6: "justparked",
};

const SLOT_CLASS: Record<SlotState, string> = {
  empty: "border-border bg-surface text-fg-subtle",
  parked: "border-border bg-surface-2 text-fg-muted",
  onway: "border-blue-400 bg-blue-100 text-blue-900",
  justparked: "border-green-400 bg-green-100 text-green-900",
  needs: "border-yellow-400 bg-yellow-100 text-yellow-900",
};

const LEGEND = [
  { label: "Car on its way", dot: "bg-blue-600" },
  { label: "Just parked", dot: "bg-green-600" },
  { label: "Parked", dot: "bg-fg-subtle" },
  { label: "Needs you", dot: "bg-yellow-500" },
];

const CHIP: Record<string, string> = {
  blue: "border-blue-300 bg-blue-50 text-blue-800",
  amber: "border-yellow-400 bg-yellow-100 text-yellow-900",
  emerald: "border-green-300 bg-green-50 text-green-800",
  rose: "border-red-300 bg-red-50 text-red-700",
  violet: "border-slate-300 bg-slate-100 text-slate-600",
  gray: "border-border bg-surface-2 text-fg-muted",
};

function Chip({ tone = "gray", children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        CHIP[tone] ?? CHIP.gray,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------- page ----------------------------------- */

function DashboardPage() {
  useEventStream();
  const plant = usePlant();

  return (
    <div className="min-h-full bg-bg">
      <div className="h-1 w-full bg-yellow-400" />
      <Header plant={plant} />
      <BatchPanel />
      <LatestException />
      <p className="px-4 pt-3 text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
        Sample dashboard data
      </p>
      <Stats />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <GateAndLanes />
          <Dock />
          <CarDetail />
        </div>
        <div className="space-y-4">
          <WaitingOnYou plant={plant} />
          <DecisionFeed />
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Header({ plant }: { plant: PlantControls }) {
  const busy = plant.spawn.isPending || plant.exception.isPending || plant.restart.isPending;
  const disabled = busy || !plant.running;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-semibold tracking-tight text-fg">Marshal</span>
        <span className="text-xs text-fg-muted">Plant supervisor · Shift A · 06:00 to 08:10</span>
      </div>
      <span
        className={cn(
          "rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          plant.running
            ? "border-green-400 bg-green-50 text-green-800"
            : "border-yellow-400 bg-yellow-100 text-yellow-800",
        )}
      >
        {plant.running ? "Live · demo plant" : "Plant not running"}
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums text-fg">06:39</span>
        <Button size="sm" disabled={disabled} onClick={() => plant.spawn.mutate()}>
          <Play className="size-3.5" />
          Play shift
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            const input = document.getElementById("batch-cars");
            input?.scrollIntoView({ behavior: "smooth", block: "center" });
            input?.focus();
          }}
        >
          Run batch
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => plant.exception.mutate()}
        >
          Next exception
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => plant.restart.mutate()}
        >
          Restart
        </Button>
        <label className="flex items-center gap-1.5 text-xs text-fg-muted">
          <input type="checkbox" defaultChecked className="size-3.5 accent-yellow-500" />
          Pause when I need to
        </label>
      </div>
    </header>
  );
}

function LatestException() {
  const events = useEventLogStore((s) => s.events);
  const latest = events.filter((e) => e.level === "warn" || e.level === "bad").at(-1);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-1.5 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">
        Latest exception
      </span>
      <span className="font-mono text-fg-subtle">{latest ? clock(latest.at) : "—"}</span>
      <span className="text-fg">
        {latest
          ? `${latest.title}${latest.detail ? ` — ${latest.detail}` : ""}`
          : "No exceptions this shift."}
      </span>
    </div>
  );
}

function Stats() {
  return (
    <div className="grid grid-cols-2 border-b border-border sm:grid-cols-3 lg:grid-cols-6">
      {STATS.map((s) => (
        <div key={s.label} className="border-b border-l border-border px-4 py-3 sm:border-b-0">
          <p className="text-[11px] text-fg-muted">{s.label}</p>
          <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-fg">{s.value}</p>
          <p className="mt-0.5 text-[10px] text-fg-subtle">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

function GateAndLanes() {
  return (
    <Card>
      <div className="p-4">
        <h2 className="text-sm font-semibold text-fg">Gate and lanes</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LANES.map((l) => (
            <div key={l.label}>
              <p className="text-[11px] text-fg-muted">{l.label}</p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="font-mono text-xl font-semibold tabular-nums text-fg">
                  {l.value}
                </span>
                {l.pill && <Chip tone={l.pill.tone}>{l.pill.text}</Chip>}
              </div>
              {l.sub && <p className="mt-0.5 text-[10px] text-fg-subtle">{l.sub}</p>}
            </div>
          ))}
        </div>

        <div className="my-4 border-t border-border" />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-fg">
            Yard <span className="font-normal text-fg-muted">· 28 of 80 slots in use</span>
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-fg-muted">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", l.dot)} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-10 gap-1">
          {ROWS.flatMap((r) =>
            COLS.map((c) => {
              const id = `${r}${c}`;
              const state: SlotState = SLOT_OVERRIDE[id] ?? (OCCUPIED.has(id) ? "parked" : "empty");
              return (
                <div
                  key={id}
                  className={cn(
                    "flex h-9 items-start justify-start rounded border p-1 font-mono text-[10px]",
                    SLOT_CLASS[state],
                  )}
                >
                  {id}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </Card>
  );
}

function Dock() {
  return (
    <Card>
      <div className="p-4">
        <h2 className="text-sm font-semibold text-fg">
          Dock <span className="font-normal text-fg-muted">· trucks of 10</span>
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-7">
          {TRUCKS.map((t) => (
            <div key={t.id}>
              <p className="text-xs font-semibold text-fg">{t.id}</p>
              <p className="text-[10px] text-fg-subtle">{t.status}</p>
              <p className="font-mono text-xs text-fg">{t.time}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function CarDetail() {
  return (
    <Card>
      <div className="p-4">
        <h2 className="text-sm font-semibold text-fg">
          Car P017 <span className="font-normal text-fg-muted">· SUV · black · trim L</span>
        </h2>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-fg-muted">Where:</span>
          <Chip tone="emerald">Parked in B6</Chip>
        </div>
        <div className="mt-3 space-y-2">
          {TIMELINE.map((row, i) => (
            <div key={`${row.time}-${i}`} className="flex items-start gap-3 text-xs">
              <span className="w-10 shrink-0 font-mono text-[10px] text-fg-subtle">{row.time}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {row.tags.map((t) => (
                  <Chip key={t.text} tone={t.tone}>
                    {t.text}
                  </Chip>
                ))}
                <span className="text-fg">{row.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WaitingOnYou({ plant }: { plant: PlantControls }) {
  const assist = plant.state?.assist ?? null;
  const busy = plant.decide.isPending;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Waiting on you</h2>
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
              assist ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800",
            )}
          >
            {assist ? 1 : 0}
          </span>
        </div>

        {!assist && (
          <p className="mt-3 rounded-md border border-border p-3 text-xs leading-relaxed text-fg-muted">
            {plant.running
              ? "No exception. The plant is running; a car will stop and ask when it needs you."
              : "The plant is not running. Start the API with MARSHAL_RUN_PLANT=1."}
          </p>
        )}

        {assist && (
          <div className="mt-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-fg">Assistance · {assist.vin}</span>
              <Chip tone="rose">Car stopped</Chip>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-fg-muted">
              {assist.situation || `${assist.vin} stopped and asks for help.`}
              {assist.location ? ` (at ${assist.location})` : ""}
            </p>

            <div className="mt-3 space-y-2">
              {assist.options.map((o) => (
                <Button
                  key={o.id}
                  variant="secondary"
                  className="h-auto w-full flex-col gap-0 py-2"
                  disabled={busy}
                  onClick={() => plant.decide.mutate({ caseId: assist.case_id, option: o.id })}
                >
                  <span className="text-xs font-semibold">{o.id.replaceAll("_", " ")}</span>
                  <span className="text-[9px] font-normal text-fg-subtle">
                    {o.id === assist.recommended
                      ? `Recommended${assist.confidence != null ? ` · ${assist.confidence.toFixed(2)}` : ""}`
                      : (o.reason ?? o.risk ?? "")}
                  </span>
                </Button>
              ))}
            </div>
            {plant.decide.isError && (
              <p className="mt-2 text-[10px] text-red-600">
                That decision was not accepted; try again.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function DecisionFeed() {
  const events = useEventLogStore((s) => s.events);
  const [onlyExceptions, setOnlyExceptions] = useState(false);
  const rows = feedRows(events, 14, onlyExceptions);

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Decision feed</h2>
          <div className="flex items-center gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setOnlyExceptions(false)}
              className={cn(
                "rounded-full px-2 py-0.5",
                !onlyExceptions
                  ? "bg-fg font-medium text-surface"
                  : "border border-border text-fg-muted",
              )}
            >
              Everything
            </button>
            <button
              type="button"
              onClick={() => setOnlyExceptions(true)}
              className={cn(
                "rounded-full px-2 py-0.5",
                onlyExceptions
                  ? "bg-fg font-medium text-surface"
                  : "border border-border text-fg-muted",
              )}
            >
              Exceptions only
            </button>
          </div>
        </div>

        <div className="relative mt-3">
          <CircleAlert className="absolute right-1 top-1 size-3.5 text-orange-500" aria-hidden />
          <div className="max-h-[440px] space-y-2 overflow-y-auto pr-4">
            {rows.length === 0 && (
              <p className="border-t border-border pt-2 text-xs text-fg-subtle">
                {onlyExceptions ? "No exceptions right now." : "Waiting for the decision stream…"}
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.key}
                data-testid="feed-row"
                className="flex items-start gap-2 border-t border-border pt-2 text-xs"
              >
                <span className="w-9 shrink-0 font-mono text-[10px] text-fg-subtle">{row.t}</span>
                <span className="shrink-0">
                  <Chip tone={row.tone}>{row.tag}</Chip>
                </span>
                <div className="min-w-0">
                  <span className="text-fg-muted">{row.text}</span>
                  {row.probs.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.probs.map(([label, p]) => (
                        <span
                          key={label}
                          className="rounded border border-border bg-surface-2 px-1 py-0.5 font-mono text-[9px] tabular-nums text-fg-muted"
                        >
                          {label} {p.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Footer() {
  return (
    <footer className="max-w-4xl px-4 pb-8 pt-2 text-[11px] leading-relaxed text-fg-subtle">
      The shift, yard and truck values above are sample dashboard data. Batch status and reports are
      loaded from the batch API when CARLA batch mode is enabled.
    </footer>
  );
}
