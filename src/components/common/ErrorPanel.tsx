import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, getErrorMessage } from "@/lib/errors";

export function ErrorPanel({
  error,
  onRetry,
  title = "Gagal memuat data",
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  compact?: boolean;
}) {
  const isApi = error instanceof ApiError;
  const message = getErrorMessage(error);
  const hint = isApi ? recoveryHint(error) : undefined;

  return (
    <div
      role="alert"
      className={`flex flex-col gap-2 rounded-lg border border-danger/40 bg-danger/10 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="text-xs text-fg-muted">{message}</p>
          {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
          {isApi && error.status > 0 && (
            <p className="mt-1 font-mono text-[10px] text-fg-subtle">HTTP {error.status}</p>
          )}
        </div>
      </div>
      {onRetry && (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            Coba lagi
          </Button>
        </div>
      )}
    </div>
  );
}

export function recoveryHint(error: ApiError): string | undefined {
  switch (error.kind) {
    case "unauthorized":
      return "Muat ulang halaman untuk memulai sesi baru.";
    case "forbidden":
      return "Hubungi supervisor jika Anda memerlukan akses ini.";
    case "not_found":
      return "Resource mungkin sudah dipindahkan atau dihapus.";
    case "conflict":
      return "Data mungkin sudah berubah di tempat lain. Muat ulang data terbaru.";
    case "validation":
      return "Periksa kembali input yang dikirim.";
    case "unavailable":
    case "timeout":
    case "network":
      return "Layanan tidak tersedia sementara. Coba beberapa saat lagi.";
    default:
      return undefined;
  }
}
