import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Play,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { FlowBadge } from "@/components/common/FlowBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FLOWS } from "@/lib/flows";
import { cn } from "@/lib/utils";

export interface DemoScene {
  id: number;
  timeSec: number;
  title: string;
  subtitle: string;
  flows: number[];
  mode: "Control Tower" | "Test Lab" | "Closed Loop";
  whatHappens: string;
  geminiRole: string;
  humanRole: string;
  realWorldBasis: string;
  primaryLink: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    label: string;
  };
  secondaryLinks?: Array<{
    to: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
    label: string;
  }>;
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 1,
    timeSec: 45,
    title: "Scene 1: Normal Flow",
    subtitle: "Rilis rutin line-end & verifikasi gate/track",
    flows: [1, 3, 4],
    mode: "Control Tower",
    whatHappens:
      "Kendaraan meninggalkan jalur perakitan; Yard Traffic Controller merilis mobil secara otomatis dengan jarak aman >= 25 m. VIN-004 melewati gerbang inspeksi visual dan trek uji fungsional dengan laporan PASS tanpa temuan.",
    geminiRole: "Monitoring aliran & siap mengeksekusi re-plan jika terjadi pengecualian.",
    humanRole: "Mengawasi dashboard tanpa intervensi manual (zero touch pada kasus rutin).",
    realWorldBasis:
      "BMW Embotech Automated Vehicle Marshalling (>3.500 mobil/hari di 7 pabrik) & Ford E-SELF Cologne.",
    primaryLink: {
      to: "/cars/$vin/report",
      params: { vin: "VIN-004" },
      label: "Buka Report PASS VIN-004",
    },
    secondaryLinks: [{ to: "/yard", label: "Lihat Yard Live" }],
  },
  {
    id: 2,
    timeSec: 60,
    title: "Scene 2: Inspeksi Menangkap 2 Cacat",
    subtitle: "Mismatch build sheet & lampu rem mati (disagreement)",
    flows: [3, 4, 5],
    mode: "Control Tower",
    whatHappens:
      "Gerbang visual mendeteksi VIN-001 dengan warna fisik Merah (ekspektasi build sheet: Biru) serta goresan pintu 6 cm. Sementara itu, trek fungsional mendeteksi lampu rem kiri VIN-002 mati (telemetri melaporkan ON, kamera mendeteksi OFF → DISAGREE). Keduanya dialokasikan otomatis ke bay rework.",
    geminiRole:
      "Multimodal vision menemukan cacat & membandingkan build sheet; merangkum tiket & memilih bay perbaikan (Paint 20m, Electrical 25m).",
    humanRole:
      "Supervisor mengonfirmasi tiket rework sebelum kendaraan dipindahkan ke bay perbaikan.",
    realWorldBasis:
      "BMW AIQX, UVeye OEM Automated Inspection, dan Google Cloud Gemini Manufacturing Pattern.",
    primaryLink: {
      to: "/quality/inspections/$vin",
      params: { vin: "VIN-001" },
      search: { kind: "visual" },
      label: "Inspeksi Visual VIN-001 (Mismatch)",
    },
    secondaryLinks: [
      {
        to: "/quality/inspections/$vin",
        params: { vin: "VIN-002" },
        search: { kind: "functional" },
        label: "Checklist VIN-002 (Brake Disagree)",
      },
      { to: "/quality/rework", label: "Daftar Bay Rework" },
    ],
  },
  {
    id: 3,
    timeSec: 45,
    title: "Scene 3: Stuck Car & Remote Assistance",
    subtitle: "Kardus di jalur + pekerja terdeteksi → Eskalasi ke Lab",
    flows: [2],
    mode: "Control Tower",
    whatHappens:
      "Sistem kemudi otonom berhenti aman 4 m sebelum kardus di jalur finishing. Remote Assistance Desk membaca klip kamera, mem-box rintangan & pekerja, dan merekomendasikan opsi 'Wait' karena ada pekerja di dekat kardus. Operator memilih 'Wait' dan mengirim insiden ini ke Test Lab.",
    geminiRole:
      "Menganalisis klip 10 detik, mem-box objek, merangking opsi sistem kemudi, dan menegakkan aturan keselamatan (pekerja dekat = rekomendasi wajib WAIT).",
    humanRole:
      "Supervisor memilih opsi eksekusi dalam waktu < 30 detik dan menekan tombol 'Kirim ke Test Lab'.",
    realWorldBasis:
      "Waymo Fleet Response (human-in-the-loop Q&A assistance tanpa remote steering) & Waymo EMMA.",
    primaryLink: {
      to: "/assistance/$case_id",
      params: { case_id: "case-01" },
      label: "Buka Assistance Case-01",
    },
    secondaryLinks: [{ to: "/assistance", label: "Antrean Assistance Desk" }],
  },
  {
    id: 4,
    timeSec: 90,
    title: "Scene 4: Test Lab & Adversarial Fuzzing",
    subtitle: "Konversi prompt ke skenario CARLA & pencarian varian gagal",
    flows: [6, 7],
    mode: "Test Lab",
    whatHappens:
      "Supervisor mengetik situasi dalam bahasa alami atau memakai insiden case-01. Gemini menyusun spec JSON terstruktur (ChatScene), divalidasi terhadap titik peta pabrik (finishing_corner.p3), dan dikompilasi ke kode CARLA. Kasus lolos di waktu senja (dusk), namun Adversarial Tester memvariasikan cahaya & jarak pemicu, menemukan kegagalan pengereman di malam hari di balik tumpukan palet (gap 0.6 m vs limit 1.5 m).",
    geminiRole:
      "Menyusun spec skenario terstruktur, memandu pencarian parameter adversarial, dan menyusun laporan kegagalan beserta usulan perbaikan kecepatan.",
    humanRole:
      "Engineer mereview spec dan mengevaluasi laporan kegagalan sebelum dimasukkan ke suite regresi.",
    realWorldBasis:
      "ChatScene (CVPR 2024), DriveFuzz (ACM CCS 2022), serta Scenic/VerifAI falsification framework.",
    primaryLink: {
      to: "/lab/scenarios/$scenarioId",
      params: { scenarioId: "S005" },
      label: "Lihat Skenario & Grid Varian S005",
    },
    secondaryLinks: [{ to: "/lab", search: { tab: "requests" }, label: "Form Generator Skenario" }],
  },
  {
    id: 5,
    timeSec: 30,
    title: "Scene 5: Closed Loop & Release Gate Blocked",
    subtitle: "Kegagalan masuk suite regresi & memblokir rilis software",
    flows: [7],
    mode: "Closed Loop",
    whatHappens:
      "Kasus kegagalan varian S005-v17 otomatis bergabung ke suite regresi. Halaman Release Gate R1.1 menampilkan status BLOCKED ('1 failing test, release blocked'). Rollout software kemudi ditahan sampai tim otonom memperbaiki pendeteksian di malam hari.",
    geminiRole: "Menyajikan bukti pengujian objektif dan data telemetri/video klip kegagalan.",
    humanRole:
      "Engineer membuat keputusan akhir untuk menahan (block) atau menyetujui (approve) rilis sistem otonom.",
    realWorldBasis:
      "Automotive Quality Gates & Autonomous Driving Continuous Integration (CI/CD) Safety Standards.",
    primaryLink: {
      to: "/lab/releases/$releaseId",
      params: { releaseId: "R1.1" },
      label: "Buka Release Gate R1.1 (Blocked)",
    },
    secondaryLinks: [{ to: "/lab", search: { tab: "releases" }, label: "Daftar Release Gates" }],
  },
];

export function FlowDemoWalkthrough({ className }: { className?: string }) {
  const [activeSceneId, setActiveSceneId] = useState(1);
  const [expanded, setExpanded] = useState(true);

  const activeScene = DEMO_SCENES.find((s) => s.id === activeSceneId) ?? DEMO_SCENES[0];

  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/30 bg-gradient-to-b from-surface via-surface to-surface-2 shadow-sm",
        className,
      )}
    >
      <CardHeader className="border-b border-border/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base font-semibold text-fg">
                Marshal Flow Design Walkthrough
              </CardTitle>
              <p className="text-xs text-fg-muted">
                5-Minute Demo Script & Arsitektur 7 Alur Operasional (Flow 1–7)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">
              2 Modes · 1 System
            </Badge>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={expanded ? "Ciutkan walkthrough" : "Perluas walkthrough"}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </Button>
          </div>
        </div>

        {/* 5 Demo Scenes Navigation Tabs */}
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {DEMO_SCENES.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  setActiveSceneId(scene.id);
                  setExpanded(true);
                }}
                className={cn(
                  "flex flex-col items-start rounded-md border p-2 text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border bg-surface-2/60 text-fg-muted hover:border-border-strong hover:bg-surface-2 hover:text-fg",
                )}
              >
                <div className="flex w-full items-center justify-between text-[10px] font-mono">
                  <span>Scene {scene.id}</span>
                  <span className="opacity-70">{scene.timeSec}s</span>
                </div>
                <span className="mt-1 line-clamp-1 text-xs font-medium">
                  {scene.title.split(": ")[1]}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 p-4 text-sm">
          {/* Active Scene Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    activeScene.mode === "Control Tower"
                      ? "info"
                      : activeScene.mode === "Test Lab"
                        ? "warning"
                        : "danger"
                  }
                >
                  {activeScene.mode}
                </Badge>
                <span className="text-sm font-semibold text-fg">{activeScene.title}</span>
                <span className="text-xs text-fg-muted">· {activeScene.subtitle}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">
                {activeScene.whatHappens}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="default" className="gap-1.5 font-medium shadow-sm">
                <Link
                  to={activeScene.primaryLink.to}
                  params={activeScene.primaryLink.params}
                  search={activeScene.primaryLink.search}
                >
                  <Play className="size-3.5 fill-current" aria-hidden />
                  {activeScene.primaryLink.label}
                </Link>
              </Button>
              {activeScene.secondaryLinks?.map((sec) => (
                <Button key={sec.label} asChild size="sm" variant="secondary" className="gap-1">
                  <Link to={sec.to} params={sec.params} search={sec.search}>
                    <ExternalLink className="size-3" aria-hidden />
                    {sec.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          {/* Core Flow Breakdown Cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Peran Gemini AI
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{activeScene.geminiRole}</p>
            </div>

            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <ShieldAlert className="size-3.5 text-warning" aria-hidden />
                Otoritas Manusia (Operator)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">{activeScene.humanRole}</p>
            </div>

            <div className="rounded-md border border-border bg-surface-2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <CheckCircle2 className="size-3.5 text-success" aria-hidden />
                Landasan Industri Riil
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                {activeScene.realWorldBasis}
              </p>
            </div>
          </div>

          {/* 7 Flows Interactive Pill Tray */}
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/80 bg-surface-2/40 px-3 py-2 text-xs">
            <span className="font-mono text-[10px] text-fg-subtle">Flows Terlibat:</span>
            {FLOWS.map((f) => {
              const involved = activeScene.flows.includes(f.id);
              return (
                <div
                  key={f.id}
                  className={cn(
                    "flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-opacity",
                    involved ? "opacity-100" : "opacity-35 grayscale",
                  )}
                >
                  <FlowBadge flow={f.id} />
                  <span className="font-mono text-[11px] text-fg">{f.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
