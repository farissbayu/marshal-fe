import { Camera, Pause, Play, RefreshCw, Video, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { drawCameraFrame } from "@/lib/mock/camera-simulator";
import { useAppStore } from "@/lib/stores/app";
import { useCameraStore } from "@/lib/stores/camera";
import { cn } from "@/lib/utils";

export function PlantCameraFeed({ className }: { className?: string }) {
  const mockMode = useAppStore((s) => s.mockMode);
  const { mode, setMode, status, setStatus, reconnect, reconnectNonce, streamUrl, snapshotUrl } =
    useCameraStore();
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-fg-muted" aria-hidden />
          <span className="text-sm font-medium text-fg">Plant CCTV</span>
          <FeedStatusBadge status={status} paused={paused} />
        </div>
        <div className="flex items-center gap-3">
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

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-[10px] text-fg-subtle">
        <span className="font-mono">CAM-GATE-01 · Town04 · 1280x720 · ~20 FPS</span>
        <span className="flex items-center gap-1">
          <Video className="size-3" aria-hidden />
          {mode === "stream" ? "MJPEG stream" : "Snapshot JPEG"}
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
  reconnectNonce,
  onStatus,
}: {
  mode: "stream" | "snapshot";
  paused: boolean;
  reconnectNonce: number;
  onStatus: (status: "connecting" | "streaming" | "snapshot_fallback" | "error") => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    onStatus(mode === "stream" ? "streaming" : "snapshot_fallback");
    let raf = 0;
    let lastSnapshot = 0;

    const render = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (!paused) {
        if (mode === "stream") {
          frameRef.current = time;
        } else if (time - lastSnapshot > 1500) {
          lastSnapshot = time;
          frameRef.current = time;
        }
      }
      drawCameraFrame(ctx, width, height, frameRef.current || time);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mode, paused, onStatus, reconnectNonce]);

  return (
    <div className="relative aspect-video w-full bg-black">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="Simulasi feed kamera plant" />
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Badge variant="neutral">PAUSED</Badge>
        </div>
      )}
      <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-warning">
        MOCK SIM
      </span>
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
