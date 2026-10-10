import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Compass,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Truck,
  Video,
  VideoOff,
  Wrench,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { drawCameraFrame } from "@/lib/mock/camera-simulator";
import {
  type AnyFlowTelemetry,
  CAMERA_PRESETS,
  type CameraPreset,
  FLOW_DEFAULT_PRESETS,
  type FlowId,
  ThreeCCTVScene,
} from "@/lib/mock/three-camera-simulator";
import { useAppStore } from "@/lib/stores/app";
import { useCameraStore } from "@/lib/stores/camera";
import { cn } from "@/lib/utils";

const FLOW_TABS: Array<{
  id: FlowId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 1, label: "F1 Traffic", icon: Truck },
  { id: 2, label: "F2 Assist", icon: ShieldAlert },
  { id: 3, label: "F3 Gate", icon: Camera },
  { id: 4, label: "F4 Track", icon: Activity },
  { id: 5, label: "F5 Rework", icon: Wrench },
  { id: 6, label: "F6 Lab", icon: Compass },
  { id: 7, label: "F7 Stress", icon: AlertTriangle },
];

export function PlantCameraFeed({ className }: { className?: string }) {
  const mockMode = useAppStore((s) => s.mockMode);
  const { mode, setMode, status, setStatus, reconnect, reconnectNonce, streamUrl, snapshotUrl } =
    useCameraStore();
  const [paused, setPaused] = useState(false);
  const [activeFlow, setActiveFlow] = useState<FlowId>(1);
  const [autoTour, setAutoTour] = useState(false);
  const [preset, setPreset] = useState<CameraPreset>("CAM-LINE-04");

  // Auto Tour cycle through all 7 flows every 7.5 seconds
  useEffect(() => {
    if (!autoTour) return;
    const interval = setInterval(() => {
      setActiveFlow((curr) => ((curr % 7) + 1) as FlowId);
    }, 7500);
    return () => clearInterval(interval);
  }, [autoTour]);

  // Sync default preset when active flow changes
  useEffect(() => {
    setPreset(FLOW_DEFAULT_PRESETS[activeFlow]);
  }, [activeFlow]);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-fg-muted" aria-hidden />
          <span className="text-sm font-medium text-fg">Plant CCTV Digital Twin</span>
          <FeedStatusBadge status={status} paused={paused} />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {mockMode && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-surface-2 p-0.5">
              {(
                [
                  "CAM-LINE-04",
                  "CAM-ASSIST-02",
                  "CAM-GATE-01",
                  "CAM-TRACK-03",
                  "CAM-REWORK-05",
                  "CAM-LAB-06",
                  "CAM-ADVERSARIAL-07",
                  "CAM-YARD-02",
                ] as CameraPreset[]
              ).map((cam) => (
                <button
                  key={cam}
                  type="button"
                  onClick={() => setPreset(cam)}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors",
                    preset === cam
                      ? "bg-primary font-semibold text-primary-fg"
                      : "text-fg-subtle hover:bg-surface hover:text-fg",
                  )}
                  title={CAMERA_PRESETS[cam].label}
                >
                  {cam === "CAM-LINE-04"
                    ? "LINE"
                    : cam === "CAM-ASSIST-02"
                      ? "ASSIST"
                      : cam === "CAM-GATE-01"
                        ? "GATE"
                        : cam === "CAM-TRACK-03"
                          ? "TRACK"
                          : cam === "CAM-REWORK-05"
                            ? "REWORK"
                            : cam === "CAM-LAB-06"
                              ? "LAB"
                              : cam === "CAM-ADVERSARIAL-07"
                                ? "STRESS"
                                : "YARD"}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-1.5 text-xs text-fg-muted">
            <span>{mode === "stream" ? "Stream Live" : "Snapshot"}</span>
            <Switch
              checked={mode === "snapshot"}
              onCheckedChange={(checked) => setMode(checked ? "snapshot" : "stream")}
              aria-label="Ganti mode stream / snapshot"
            />
          </label>
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label={paused ? "Lanjutkan feed" : "Jeda feed"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </Button>
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label="Reconnect feed"
            onClick={reconnect}
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Flow Selector Toolbar (Mock Mode) */}
      {mockMode && (
        <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border bg-surface-2 px-3 py-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
              Visualized Flow:
            </span>
            {FLOW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setAutoTour(false);
                  setActiveFlow(tab.id);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors",
                  activeFlow === tab.id
                    ? "bg-primary font-semibold text-primary-fg shadow-xs"
                    : "text-fg-subtle hover:bg-surface hover:text-fg",
                )}
              >
                <tab.icon className="size-3" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoTour((t) => !t)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium border transition-colors",
                autoTour
                  ? "border-emerald-500/50 bg-emerald-500/10 font-semibold text-emerald-400 animate-pulse"
                  : "border-border text-fg-muted hover:bg-surface hover:text-fg",
              )}
              title="Otomatis berputar ke semua 7 flow secara berurutan setiap 7 detik"
            >
              <Sparkles className="size-3" />
              <span>{autoTour ? "Auto Tour: ON (7s)" : "Auto Tour"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main CCTV Screen */}
      {status === "error" ? (
        <div className="flex flex-col items-center justify-center gap-2 bg-surface-2 py-16 text-center">
          <VideoOff className="size-6 text-danger" aria-hidden />
          <p className="text-sm font-medium text-fg">CCTV Stream Unavailable</p>
          <p className="max-w-xs text-xs text-fg-muted">
            Kamera plant tidak dapat dijangkau (503). Coba reconnect atau gunakan mode snapshot.
          </p>
          <Button size="sm" variant="secondary" onClick={reconnect}>
            <RefreshCw className="size-3.5" /> Coba lagi
          </Button>
        </div>
      ) : mockMode ? (
        <MockCameraSurface
          mode={mode}
          paused={paused}
          preset={preset}
          activeFlow={activeFlow}
          reconnectNonce={reconnectNonce}
          onStatus={setStatus}
        />
      ) : (
        <RealCameraSurface
          mode={mode}
          paused={paused}
          streamUrl={streamUrl}
          snapshotUrl={snapshotUrl}
          reconnectNonce={reconnectNonce}
          onStatus={setStatus}
        />
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-[10px] text-fg-subtle">
        <span className="font-mono">
          {CAMERA_PRESETS[preset].name} · {CAMERA_PRESETS[preset].location} · 1280x720 · Flow{" "}
          {activeFlow}
        </span>
        <span className="flex items-center gap-1">
          <Video className="size-3" aria-hidden />
          {mockMode
            ? "3D WebGL Digital Twin (Three.js · 7 Flows)"
            : mode === "stream"
              ? "MJPEG stream"
              : "Snapshot JPEG"}
        </span>
      </div>
    </div>
  );
}

function FeedStatusBadge({ status, paused }: { status: string; paused: boolean }) {
  if (paused) return <Badge variant="neutral">PAUSED</Badge>;
  if (status === "streaming" || status === "snapshot_fallback") {
    return (
      <Badge variant="danger" className="gap-1">
        <span className="size-1.5 animate-live rounded-full bg-danger" aria-hidden />
        LIVE
      </Badge>
    );
  }
  if (status === "error") return <Badge variant="danger">OFFLINE</Badge>;
  return <Badge variant="warning">CONNECTING</Badge>;
}

function MockCameraSurface({
  mode,
  paused,
  preset,
  activeFlow,
  reconnectNonce,
  onStatus,
}: {
  mode: "stream" | "snapshot";
  paused: boolean;
  preset: CameraPreset;
  activeFlow: FlowId;
  reconnectNonce: number;
  onStatus: (status: "connecting" | "streaming" | "snapshot_fallback" | "error") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ThreeCCTVScene | null>(null);
  const [telemetry, setTelemetry] = useState<AnyFlowTelemetry | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onStatus(mode === "stream" ? "streaming" : "snapshot_fallback");

    const scene = new ThreeCCTVScene(canvas);
    sceneRef.current = scene;

    if (scene.supported) {
      let lastTelemetryTime = 0;
      scene.onTelemetry((t) => {
        const now = performance.now();
        if (now - lastTelemetryTime > 140) {
          lastTelemetryTime = now;
          setTelemetry(t);
        }
      });

      scene.setFlowMode(activeFlow);
      scene.setCameraPreset(preset);
      scene.setPaused(paused);
      scene.resize(canvas.clientWidth, canvas.clientHeight);
      scene.start();

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          scene.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      observer.observe(canvas);

      return () => {
        observer.disconnect();
        scene.dispose();
        sceneRef.current = null;
      };
    }

    // Fallback to 2D canvas in headless/non-WebGL environments
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      drawCameraFrame(ctx, width, height, time);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mode, onStatus, reconnectNonce]);

  useEffect(() => {
    if (sceneRef.current?.supported) {
      sceneRef.current.setFlowMode(activeFlow);
    }
  }, [activeFlow]);

  useEffect(() => {
    if (sceneRef.current?.supported) {
      sceneRef.current.setCameraPreset(preset);
    }
  }, [preset]);

  useEffect(() => {
    if (sceneRef.current?.supported) {
      sceneRef.current.setPaused(paused);
    }
  }, [paused]);

  return (
    <div className="relative aspect-video w-full select-none overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        aria-label="Simulasi 3D feed kamera plant"
      />
      {paused && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <Badge variant="neutral">PAUSED</Badge>
        </div>
      )}

      {/* Top Overlay Badge & Preset Name */}
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded border border-emerald-500/30 bg-black/80 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400 backdrop-blur-xs">
            <Activity className="size-3 animate-pulse text-emerald-400" />
            FLOW {activeFlow}: {getFlowShortName(activeFlow)}
          </span>

          <FlowTopPill telemetry={telemetry} activeFlow={activeFlow} />
        </div>

        <span className="rounded border border-cyan-500/30 bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 backdrop-blur-xs">
          3D TWIN · {CAMERA_PRESETS[preset].name}
        </span>
      </div>

      {/* Bottom Telemetry HUD tailored to Active Flow */}
      <FlowBottomOverlay telemetry={telemetry} activeFlow={activeFlow} />
    </div>
  );
}

function getFlowShortName(flowId: FlowId): string {
  switch (flowId) {
    case 1:
      return "YARD TRAFFIC";
    case 2:
      return "REMOTE ASSIST";
    case 3:
      return "VISUAL INSPECT";
    case 4:
      return "TRACK FUNCTIONAL";
    case 5:
      return "REWORK ROUTING";
    case 6:
      return "LAB SCENARIO";
    case 7:
      return "ADVERSARIAL STRESS";
  }
}

function FlowTopPill({
  telemetry,
  activeFlow,
}: {
  telemetry: AnyFlowTelemetry | null;
  activeFlow: FlowId;
}) {
  if (!telemetry) return null;

  if (activeFlow === 1 && telemetry.flow === 1) {
    return (
      <span
        className={cn(
          "flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-bold backdrop-blur-xs transition-colors",
          telemetry.headwayRuleMet
            ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
            : "border-amber-500/40 bg-amber-950/80 text-amber-300",
        )}
      >
        {telemetry.headwayRuleMet ? (
          <CheckCircle2 className="size-3 text-emerald-400" />
        ) : (
          <AlertTriangle className="size-3 text-amber-400" />
        )}
        HEADWAY: {telemetry.headwayM.toFixed(1)}m{" "}
        {telemetry.headwayRuleMet ? "(OK ≥ 25m)" : "(HOLD < 25m)"}
      </span>
    );
  }

  if (activeFlow === 2 && telemetry.flow === 2) {
    return (
      <span className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 backdrop-blur-xs">
        <AlertTriangle className="size-3 text-amber-400" />
        STOPPED: {telemetry.stoppedDistanceM}m TO BOX · WORKER 3.0m NEARBY
      </span>
    );
  }

  if (activeFlow === 3 && telemetry.flow === 3) {
    return (
      <span className="flex items-center gap-1 rounded border border-sky-500/40 bg-sky-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300 backdrop-blur-xs">
        <Camera className="size-3 text-sky-400" />
        GATE 4-CAM SCANNER: 8 ZONES EVALUATED · REVIEW REQUIRED
      </span>
    );
  }

  if (activeFlow === 4 && telemetry.flow === 4) {
    return (
      <span className="flex items-center gap-1 rounded border border-danger/40 bg-danger/20 px-2 py-0.5 font-mono text-[10px] font-bold text-danger backdrop-blur-xs">
        <AlertTriangle className="size-3 text-danger animate-ping" />
        DISAGREEMENT: TELEMETRY (OK) vs CAMERA (LEFT BULB DEAD)
      </span>
    );
  }

  if (activeFlow === 5 && telemetry.flow === 5) {
    return (
      <span className="flex items-center gap-1 rounded border border-indigo-500/40 bg-indigo-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300 backdrop-blur-xs">
        <Wrench className="size-3 text-indigo-400" />
        ROUTE: {telemetry.routeToBay} ({telemetry.estimatedMinutes}m) · POLICY: FAILED ITEMS ONLY
      </span>
    );
  }

  if (activeFlow === 6 && telemetry.flow === 6) {
    return (
      <span className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300 backdrop-blur-xs">
        <Compass className="size-3 text-amber-400" />
        CHATSCENE SPEC: VALID · DUSK AT FINISHING CORNER
      </span>
    );
  }

  if (activeFlow === 7 && telemetry.flow === 7) {
    return (
      <span className="flex items-center gap-1 rounded border border-rose-500/50 bg-rose-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 backdrop-blur-xs">
        <AlertTriangle className="size-3 text-rose-400 animate-pulse" />
        CRITICAL NEAR MISS: GAP {telemetry.minGapRecordedM}m &lt; {telemetry.gapLimitM}m LIMIT
      </span>
    );
  }

  return null;
}

function FlowBottomOverlay({
  telemetry,
  activeFlow,
}: {
  telemetry: AnyFlowTelemetry | null;
  activeFlow: FlowId;
}) {
  if (!telemetry) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 bg-black/85 px-3 py-2 font-mono text-[10px] text-fg-subtle backdrop-blur-md">
      {/* FLOW 1 HUD */}
      {activeFlow === 1 && telemetry.flow === 1 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
              <span className="font-medium text-fg">{telemetry.leadingVin}</span>
              <span className="text-fg-muted">({telemetry.leadingSpeedKmh} km/h)</span>
              <span className="text-cyan-400">
                {telemetry.leadingStatus === "GATE_INSPECTION" ? "Gate Inspection" : "Yard Bound"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  telemetry.headwayRuleMet ? "bg-emerald-400" : "animate-ping bg-amber-400",
                )}
              />
              <span className="font-medium text-fg">{telemetry.trailingVin}</span>
              <span className="text-fg-muted">({telemetry.trailingSpeedKmh} km/h)</span>
              <span
                className={
                  telemetry.headwayRuleMet ? "text-emerald-400" : "font-semibold text-amber-400"
                }
              >
                {telemetry.trailingStatus === "HOLDING_AT_LINE_END" ? "Line Exit Hold" : "Released"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-fg-muted">
              <Truck className="size-3 text-indigo-400" />
              <span>{telemetry.activeTruck.truckId}:</span>
              <span className="font-semibold text-indigo-300">
                {telemetry.activeTruck.stagedCars}/{telemetry.activeTruck.capacity} Staged
              </span>
            </span>
            <span className="hidden text-fg-subtle sm:inline">·</span>
            <span className="hidden text-[9px] text-fg-subtle sm:inline">Rule: Headway ≥ 25m</span>
          </div>
        </>
      )}

      {/* FLOW 2 HUD */}
      {activeFlow === 2 && telemetry.flow === 2 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 animate-ping rounded-full bg-amber-400" />
              <span className="font-semibold text-fg">{telemetry.vin}</span>
              <span className="text-amber-400">({telemetry.obstacleType})</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-emerald-300 font-semibold border border-emerald-500/30">
                ⭐ Rec: WAIT_OPERATOR
              </span>
              <span className="text-fg-muted">B: Bypass Left (3 km/h)</span>
              <span className="text-fg-muted">C: Reroute (+2m)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-medium">
              Timer: {telemetry.timeoutRemainingS}s
            </span>
            <a
              href="/assistance/case-01"
              className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
            >
              Resolve in Desk <ArrowRight className="size-3" />
            </a>
          </div>
        </>
      )}

      {/* FLOW 3 HUD */}
      {activeFlow === 3 && telemetry.flow === 3 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-sky-400" />
              <span className="font-semibold text-fg">{telemetry.vin}</span>
              <span className="text-fg-muted">({telemetry.speedKmh} km/h crawl)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-rose-300 border border-rose-500/30">
                Door scratch 6cm (0.78 conf)
              </span>
              <span className="rounded bg-amber-950/80 px-1.5 py-0.5 text-amber-300 border border-amber-500/30">
                Missing AWD Badge (0.94 conf)
              </span>
            </div>
          </div>

          <a
            href="/inspections/VIN-001"
            className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
          >
            Review Report <ArrowRight className="size-3" />
          </a>
        </>
      )}

      {/* FLOW 4 HUD */}
      {activeFlow === 4 && telemetry.flow === 4 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-400" />
              <span className="font-semibold text-fg">{telemetry.vin}</span>
              <span className="text-cyan-300">
                {telemetry.routineId} ({telemetry.currentStep}/{telemetry.totalSteps}:{" "}
                {telemetry.currentAction})
              </span>
            </div>
            <div className="flex items-center gap-2 text-danger">
              <span className="font-semibold">{telemetry.disagreementItem}</span>
            </div>
          </div>

          <a
            href="/inspections/VIN-002"
            className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
          >
            View Checklist <ArrowRight className="size-3" />
          </a>
        </>
      )}

      {/* FLOW 5 HUD */}
      {activeFlow === 5 && telemetry.flow === 5 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-400" />
              <span className="font-semibold text-fg">{telemetry.vin}</span>
              <span className="text-indigo-300 font-semibold">→ {telemetry.routeToBay}</span>
            </div>
            <div className="flex items-center gap-1.5 text-fg-muted">
              <span>Bays:</span>
              <span className="text-fg">PAINT 1/3</span> ·<span className="text-fg">ELEC 1/2</span>{" "}
              ·<span className="text-fg">MECH 0/2</span>
            </div>
          </div>

          <a
            href="/yard"
            className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
          >
            Manage Rework <ArrowRight className="size-3" />
          </a>
        </>
      )}

      {/* FLOW 6 HUD */}
      {activeFlow === 6 && telemetry.flow === 6 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-400" />
              <span className="font-semibold text-fg">{telemetry.scenarioId}</span>
              <span className="text-fg-subtle truncate max-w-sm">"{telemetry.prompt}"</span>
            </div>
            <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 text-emerald-300 border border-emerald-500/30">
              Named Points: finishing_corner.p3
            </span>
          </div>

          <a
            href="/lab"
            className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
          >
            Open Test Lab <ArrowRight className="size-3" />
          </a>
        </>
      )}

      {/* FLOW 7 HUD */}
      {activeFlow === 7 && telemetry.flow === 7 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 animate-ping rounded-full bg-rose-400" />
              <span className="font-semibold text-fg">{telemetry.scenarioId}</span>
              <span className="text-fg-muted">
                (Iteration {telemetry.iteration}/{telemetry.maxIterations})
              </span>
            </div>
            <span className="rounded bg-rose-950/80 px-1.5 py-0.5 text-rose-300 font-semibold border border-rose-500/40">
              Violated: Gap {telemetry.minGapRecordedM}m (Limit: {telemetry.gapLimitM}m)
            </span>
          </div>

          <a
            href="/lab/releases/rel-02"
            className="flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-fg hover:bg-primary/90"
          >
            Regression Report <ArrowRight className="size-3" />
          </a>
        </>
      )}
    </div>
  );
}

function RealCameraSurface({
  mode,
  paused,
  streamUrl,
  snapshotUrl,
  reconnectNonce,
  onStatus,
}: {
  mode: "stream" | "snapshot";
  paused: boolean;
  streamUrl: string;
  snapshotUrl: string;
  reconnectNonce: number;
  onStatus: (status: "connecting" | "streaming" | "snapshot_fallback" | "error") => void;
}) {
  const [snapshotTick, setSnapshotTick] = useState(0);
  const src =
    mode === "stream"
      ? `${streamUrl}?t=${reconnectNonce}`
      : `${snapshotUrl}?t=${reconnectNonce}-${snapshotTick}`;

  useEffect(() => {
    if (mode !== "snapshot" || paused) return;
    const timer = setInterval(() => setSnapshotTick((t) => t + 1), 3000);
    return () => clearInterval(timer);
  }, [mode, paused]);

  return (
    <div className="relative aspect-video w-full bg-black">
      <img
        key={src}
        src={src}
        alt="Feed kamera plant"
        className="h-full w-full object-contain"
        onLoad={() => onStatus(mode === "stream" ? "streaming" : "snapshot_fallback")}
        onError={() => onStatus("error")}
      />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Badge variant="neutral">PAUSED</Badge>
        </div>
      )}
    </div>
  );
}
