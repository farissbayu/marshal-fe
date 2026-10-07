import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/stores/app";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const apiStatus = useAppStore((s) => s.apiStatus);
  const streamStatus = useAppStore((s) => s.streamStatus);

  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-live="polite"
      aria-label="Status koneksi"
    >
      <Badge
        variant={
          apiStatus === "connected" ? "success" : apiStatus === "degraded" ? "warning" : "danger"
        }
        className="gap-1"
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            apiStatus === "connected"
              ? "bg-success"
              : apiStatus === "degraded"
                ? "bg-warning"
                : "bg-danger",
          )}
          aria-hidden
        />
        <span className="hidden sm:inline">API {apiStatus}</span>
        <span className="sm:hidden">API</span>
      </Badge>
      <Badge
        variant={
          streamStatus === "live"
            ? "success"
            : streamStatus === "reconnecting"
              ? "warning"
              : "danger"
        }
        className="gap-1"
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            streamStatus === "live"
              ? "animate-live bg-success"
              : streamStatus === "reconnecting"
                ? "bg-warning"
                : "bg-danger",
          )}
          aria-hidden
        />
        <span className="hidden sm:inline">SSE {streamStatus}</span>
        <span className="sm:hidden">SSE</span>
      </Badge>
    </div>
  );
}
