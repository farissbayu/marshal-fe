import type { FlowEvent, Severity } from "@/lib/schemas";

interface Template {
  flow: number;
  source: string;
  titles: string[];
  details: string[];
  level: Severity;
}

const TEMPLATES: Template[] = [
  {
    flow: 1,
    source: "yard-traffic",
    level: "info",
    titles: ["Vehicle moving", "Mission arrival", "Speed update"],
    details: [
      "VIN-003 heading to TRACK-1 at 14 km/h.",
      "VIN-012 arrived at checkpoint TRACK-2.",
      "VIN-002 waiting for dispatch in ZONE-A.",
    ],
  },
  {
    flow: 2,
    source: "assistance-desk",
    level: "warn",
    titles: ["Assistance request", "Case escalation", "Recommendation ready"],
    details: [
      "VIN-005 requesting assistance: unidentified obstacle.",
      "case-02 escalated to field supervisor.",
      "Recommendation BYPASS_LEFT confidence 0.87 for case-01.",
    ],
  },
  {
    flow: 3,
    source: "visual-inspector",
    level: "info",
    titles: ["Gate scan", "Visual finding", "Build sheet check"],
    details: [
      "VIN-001 entered the camera gate, starting visual inspection.",
      "Finding: Scratch on HOOD (confidence 0.92).",
      "Color mismatch: expected White, found Silver.",
    ],
  },
  {
    flow: 4,
    source: "functional-check",
    level: "good",
    titles: ["Step checklist", "Telemetry received", "Camera OK"],
    details: [
      "VIN-003 completed Brake test 11.8 m.",
      "Telemetry/camera disagreement on Light check VIN-002.",
      "Horn test 84 dB, verdict OK.",
    ],
  },
  {
    flow: 5,
    source: "report-rework",
    level: "bad",
    titles: ["Verdict issued", "Bay allocation", "Reinspection"],
    details: [
      "VIN-001 verdict FAIL, 3 open findings.",
      "TKT-001 allocated to BAY-A for Body & Paint.",
      "VIN-010 waiting for reinspection after repair is done.",
    ],
  },
  {
    flow: 6,
    source: "scenario-generator",
    level: "info",
    titles: ["Scenario conversion", "Dry-run complete", "New request"],
    details: [
      "case-02 converted to scenario S001.",
      "Dry-run S005 passed with no collision.",
      "New test request from operator received.",
    ],
  },
  {
    flow: 7,
    source: "adversarial-tester",
    level: "good",
    titles: ["Adversarial run", "Failing variant", "Regression"],
    details: [
      "24 runs completed for S005, verdict ROBUST.",
      "Release R1.1 BLOCKED: 2 tests failed criteria.",
      "Regression evaluation R1.2 started.",
    ],
  },
];

const VINS = ["VIN-001", "VIN-002", "VIN-003", "VIN-005", "VIN-006", "VIN-010"];

type Listener = (events: FlowEvent[]) => void;

class EventSimulator {
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private tick = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.start();
    listener(this.buildBatch(10, true));
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.stop();
    };
  }

  private start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      const batch = this.buildBatch(1 + Math.floor(Math.random() * 2), false);
      for (const listener of this.listeners) listener(batch);
    }, 1800);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private buildBatch(count: number, backfill: boolean): FlowEvent[] {
    const events: FlowEvent[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i += 1) {
      const template = TEMPLATES[this.tick % TEMPLATES.length];
      const idx = this.tick % (template?.titles.length ?? 1);
      this.tick += 1;
      this.seq += 1;
      const title = template.titles[idx];
      const detailTemplate = template.details[idx].replace(/VIN-\d{3}/, VIN0(this.seq));
      events.push({
        seq: this.seq,
        at: new Date(backfill ? now - (count - i) * 1800 : now).toISOString(),
        flow: template.flow,
        source: template.source,
        title,
        detail: detailTemplate,
        level: template.level,
      });
    }
    return events;
  }
}

function VIN0(seq: number): string {
  return VINS[seq % VINS.length];
}

export const eventSimulator = new EventSimulator();
