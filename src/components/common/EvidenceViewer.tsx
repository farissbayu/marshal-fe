import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, ImageOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { fetchMedia } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

/**
 * Loads evidence through the authenticated media endpoint only.
 * Never treats a raw storage URI as a public browser URL.
 */
export function EvidenceViewer({
  mediaId,
  label,
  className,
  compact,
}: {
  mediaId: string;
  label?: string;
  className?: string;
  compact?: boolean;
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

  return (
    <div className={cn("space-y-1", className)}>
      <button
        type="button"
        className="block w-full overflow-hidden rounded-md border border-border bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
      </button>
      <p className="flex items-center gap-1 font-mono text-[10px] text-fg-subtle">
        <ImageIcon className="size-3" aria-hidden />
        {label ? `${label} · ` : ""}
        {media.media_id} · {media.kind}
      </p>
    </div>
  );
}
