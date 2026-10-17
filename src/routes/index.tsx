import { createFileRoute } from "@tanstack/react-router";
import { Camera, CircleAlert, Play } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const FEED = [
  { t: "06:39", tag: "Gemini", tone: "blue", text: "P038 assistance: wait 20 s" },
  { t: "06:39", tag: "Plan", tone: "violet", text: "P038 assigned to C8." },
  {
    t: "06:40",
    tag: "Gemini",
    tone: "blue",
    text: "P038 no defect, matches build sheet, lamps lit.",
  },
  { t: "06:39", tag: "Plan", tone: "violet", text: "P039 assigned to A9." },
  {
    t: "06:37",
    tag: "Gemini",
    tone: "blue",
    text: "P039 no defect, matches build sheet, lamps lit.",
  },
  { t: "06:37", tag: "Awaiting", tone: "amber", text: "P038 assigned to C8, needs supervisor." },
  { t: "06:36", tag: "Plan", tone: "violet", text: "P038 assigned to C7." },
  {
    t: "06:36",
    tag: "Gemini",
    tone: "blue",
    text: "P039 no defect, matches build sheet, lamps lit.",
  },
  { t: "06:35", tag: "Plan", tone: "violet", text: "P039 assigned to A3." },
  {
    t: "06:34",
    tag: "Gemini",
    tone: "blue",
    text: "P038 no defect, matches build sheet, lamps lit.",
  },
  { t: "06:34", tag: "Plan", tone: "violet", text: "P039 assigned to A8." },
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
  return (
    <div className="min-h-full bg-bg">
      <div className="h-1 w-full bg-yellow-400" />
      <Header />
      <LatestException />
      <Stats />
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <GateAndLanes />
          <Dock />
          <CarDetail />
        </div>
        <div className="space-y-4">
          <WaitingOnYou />
          <DecisionFeed />
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-surface px-4 py-2">
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-semibold tracking-tight text-fg">Marshal</span>
        <span className="text-xs text-fg-muted">Plant supervisor · Shift A · 06:00 to 08:10</span>
      </div>
      <span className="rounded border border-yellow-400 bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-800">
        Backup · Simulated shift
      </span>
      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums text-fg">06:39</span>
        <Button size="sm">
          <Play className="size-3.5" />
          Play shift
        </Button>
        <Button size="sm" variant="secondary">
          Next exception
        </Button>
        <Button size="sm" variant="secondary">
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
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-1.5 text-xs">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600">
        Latest exception
      </span>
      <span className="font-mono text-fg-subtle">06:39</span>
      <span className="text-fg">P038 assistance: wait 20 s (0.82). A reroute adds about 90 s.</span>
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

function WaitingOnYou() {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Waiting on you</h2>
          <span className="flex size-6 items-center justify-center rounded-full bg-yellow-100 text-xs font-semibold text-yellow-800">
            2
          </span>
        </div>

        <div className="mt-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">Assistance · P038</span>
            <Chip tone="rose">Car stopped</Chip>
          </div>

          <div className="relative mt-2 aspect-video w-full overflow-hidden rounded border border-border bg-surface-2">
            <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-white">
              REC
            </span>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-fg-subtle">
              <Camera className="size-4" />
              <span className="font-mono text-[10px]">CAM-LINE-04 · LANE B</span>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            P038 stopped behind a forklift in lane B. Gemini sees options B, C and is recommending
            A. A reroute adds about 90 s. Other cars use lane B.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-auto flex-col gap-0 py-2">
              <span className="text-xs font-semibold">Wait 20 s</span>
              <span className="text-[9px] font-normal text-fg-subtle">Recommended · 0.82</span>
            </Button>
            <Button variant="secondary" className="h-auto flex-col gap-0 py-2">
              <span className="text-xs font-semibold">Reroute +90 s</span>
              <span className="text-[9px] font-normal text-fg-subtle">adds ~1.5 min</span>
            </Button>
          </div>

          <Button variant="secondary" className="mt-2 h-auto w-full flex-col gap-0 py-2">
            <span className="text-xs font-semibold">Stop, call a driver</span>
            <span className="text-[9px] font-normal text-fg-subtle">for faults</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DecisionFeed() {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-fg">Decision feed</h2>
          <div className="flex items-center gap-1 text-[10px]">
            <span className="rounded-full bg-fg px-2 py-0.5 font-medium text-surface">
              Everything
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-fg-muted">
              Exceptions only
            </span>
          </div>
        </div>

        <div className="relative mt-3">
          <CircleAlert className="absolute right-1 top-1 size-3.5 text-orange-500" aria-hidden />
          <div className="max-h-[440px] space-y-2 overflow-y-auto pr-4">
            {FEED.map((row, i) => (
              <div
                key={`${row.t}-${i}`}
                className="flex items-start gap-2 border-t border-border pt-2 text-xs"
              >
                <span className="w-9 shrink-0 font-mono text-[10px] text-fg-subtle">{row.t}</span>
                <span className="shrink-0">
                  <Chip tone={row.tone}>{row.tag}</Chip>
                </span>
                <span className="text-fg-muted">{row.text}</span>
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
      Mockup of the supervisor screen for the demo. The shift, cars, confidence and lane rate are
      sample values. Measured in our evals: gate median 4.9 s a car; lamp check 1.2 s; Gemini 2.5
      Flash on Vertex AI in asia-northeast1, so one line can keep up with a lane of cars a minute.
      The working dashboard is being built in the web app.
    </footer>
  );
}
