import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, ImageOff, Loader2, Video } from "lucide-react";
import { useState } from "react";
import { fetchMedia } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export interface EvidenceBox {
  label?: string;
  box: number[];
  confidence?: number;
}

/**
 * Loads evidence through the authenticated media endpoint only.
 * Supports both static inspection images and replay MP4 clips,
 * with optional bounding-box overlays for detected objects.
 */
export function EvidenceViewer({
  mediaId,
  label,
  className,
  compact,
  boxes,
}: {
  mediaId: string;
  label?: string;
  className?: string;
  compact?: boolean;
  boxes?: EvidenceBox[];
}) {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({
    queryKey: ["media", mediaId],
    queryFn: () => fetchMedia(mediaId),
    retry: false,
    staleTime: 60_000,
  });

  const unavailable = query.isError || (query.data && !query.data.available);
  const errorKind = query.error instanceof ApiError ? query.error.kind : undefined;

  if (query.isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border border-border bg-surface-2",
          compact ? "h-24" : "h-48",
          className,
        )}
        role="status"
        aria-busy="true"
      >
        <Loader2 className="size-5 animate-spin text-fg-subtle" aria-hidden />
      </div>
    );
  }

  if (unavailable) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-surface-2 px-3 text-center",
          compact ? "h-24" : "h-48",
          className,
        )}
      >
        <ImageOff className="size-5 text-fg-subtle" aria-hidden />
        <p className="text-xs text-fg-muted">
          {errorKind === "not_found" || errorKind === "validation"
            ? "Media telah kedaluwarsa"
            : "Media tidak tersedia"}
        </p>
        <p className="font-mono text-[10px] text-fg-subtle">{mediaId}</p>
      </div>
    );
  }

  const media = query.data;
  if (!media) return null;

  const isVideo =
    media.kind === "clip" &&
    (media.content_type.startsWith("video/") ||
      media.url.endsWith(".mp4") ||
      media.url.endsWith(".webm") ||
      (!media.url.startsWith("data:image/") && !media.content_type.startsWith("image/")));

  return (
    <div className={cn("space-y-1", className)}>
      {isVideo ? (
        <div className="relative block w-full overflow-hidden rounded-md border border-border bg-black">
          <video
            src={media.url}
            controls
            muted
            playsInline
            className={cn(
              "mx-auto w-full object-contain",
              compact ? "h-24" : expanded ? "max-h-[70vh]" : "h-48",
            )}
            aria-label={label ?? `Evidence ${mediaId}`}
          >
            Browser Anda tidak mendukung tag video.
          </video>
          {renderBoxes(boxes)}
        </div>
      ) : (
        <button
          type="button"
          className="relative block w-full overflow-hidden rounded-md border border-border bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Perkecil media" : "Perbesar media"}
        >
          <img
            src={media.url}
            alt={label ?? `Evidence ${mediaId}`}
            loading="lazy"
            className={cn(
              "mx-auto w-full object-contain",
              compact ? "h-24" : expanded ? "max-h-[70vh]" : "h-48",
            )}
          />
          {renderBoxes(boxes)}
        </button>
      )}

      <p className="flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
        {media.kind === "clip" ? (
          <Video className="size-3 text-info" aria-hidden />
        ) : (
          <ImageIcon className="size-3" aria-hidden />
        )}
        {label ? `${label} · ` : ""}
        {media.media_id} · {media.kind}
        {media.kind === "clip" && isVideo ? " (MP4)" : ""}
      </p>
    </div>
  );
}

function renderBoxes(boxes?: EvidenceBox[]) {
  if (!boxes || boxes.length === 0) return null;

  return boxes.map((b, idx) => {
    if (!b.box || b.box.length < 4) return null;
    const isScale1000 = b.box.some((v) => v > 1);
    const factor = isScale1000 ? 10 : 0.01;
    const [ymin, xmin, ymax, xmax] = b.box;
    const top = ymin / factor;
    const left = xmin / factor;
    const width = (xmax - xmin) / factor;
    const height = (ymax - ymin) / factor;

    return (
      <div
        key={idx}
        className="pointer-events-none absolute border-2 border-danger bg-danger/15"
        style={{
          top: `${Math.max(0, Math.min(100, top))}%`,
          left: `${Math.max(0, Math.min(100, left))}%`,
          width: `${Math.max(0, Math.min(100, width))}%`,
          height: `${Math.max(0, Math.min(100, height))}%`,
        }}
        data-testid="evidence-bbox"
      >
        {b.label && (
          <span className="absolute -top-5 left-0 rounded-xs bg-danger px-1 font-mono text-[10px] font-semibold text-white shadow-xs">
            {b.label}
            {b.confidence !== undefined ? ` (${Math.round(b.confidence * 100)}%)` : ""}
          </span>
        )}
      </div>
    );
  });
}
