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
    titles: ["Kendaraan bergerak", "Mission arrival", "Update kecepatan"],
    details: [
      "VIN-003 menuju TRACK-1 dengan kecepatan 14 km/h.",
      "VIN-012 tiba di checkpoint TRACK-2.",
      "VIN-002 menunggu dispatch di ZONE-A.",
    ],
  },
  {
    flow: 2,
    source: "assistance-desk",
    level: "warn",
    titles: ["Permintaan bantuan", "Eskalasi case", "Rekomendasi siap"],
    details: [
      "VIN-005 meminta bantuan: obstacle tidak teridentifikasi.",
      "case-02 dieskalasi ke supervisor lapangan.",
      "Rekomendasi BYPASS_LEFT confidence 0.87 untuk case-01.",
    ],
  },
  {
    flow: 3,
    source: "visual-inspector",
    level: "info",
    titles: ["Gate scan", "Temuan visual", "Build sheet check"],
    details: [
      "VIN-001 masuk gerbang kamera, memulai inspeksi visual.",
      "Temuan: Scratch pada HOOD (confidence 0.92).",
      "Mismatch warna: expected White, found Silver.",
    ],
  },
  {
    flow: 4,
    source: "functional-check",
    level: "good",
    titles: ["Checklist langkah", "Telemetry diterima", "Kamera OK"],
    details: [
      "VIN-003 menyelesaikan Brake test 11.8 m.",
      "Disagreement telemetry/kamera pada Light check VIN-002.",
      "Horn test 84 dB, verdict OK.",
    ],
  },
  {
    flow: 5,
    source: "report-rework",
    level: "bad",
    titles: ["Verdict diterbitkan", "Alokasi bay", "Reinspection"],
    details: [
      "VIN-001 verdict FAIL, 3 temuan terbuka.",
      "TKT-001 dialokasikan ke BAY-A untuk Body & Paint.",
      "VIN-010 menunggu reinspection setelah repair selesai.",
    ],
  },
  {
    flow: 6,
    source: "scenario-generator",
    level: "info",
    titles: ["Konversi skenario", "Dry-run selesai", "Request baru"],
    details: [
      "case-02 dikonversi menjadi skenario S001.",
      "Dry-run S005 lulus tanpa collision.",
      "Test request baru dari operator diterima.",
    ],
  },
  {
    flow: 7,
    source: "adversarial-tester",
    level: "good",
    titles: ["Adversarial run", "Failing variant", "Regresi"],
    details: [
      "24 run selesai untuk S005, verdict ROBUST.",
      "Release R1.1 BLOCKED: 2 test gagal criteria.",
      "Evaluasi regresi R1.2 dimulai.",
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
