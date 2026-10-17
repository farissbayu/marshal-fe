import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, getErrorMessage } from "@/lib/errors";

export function ErrorPanel({
  error,
  onRetry,
  title = "Failed to load data",
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
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function recoveryHint(error: ApiError): string | undefined {
  switch (error.kind) {
    case "unauthorized":
      return "Reload the page to start a new session.";
    case "forbidden":
      return "Contact a supervisor if you need this access.";
    case "not_found":
      return "The resource may have been moved or deleted.";
    case "conflict":
      return "Data may have changed elsewhere. Reload the latest data.";
    case "validation":
      return "Check the submitted input again.";
    case "unavailable":
    case "timeout":
    case "network":
      return "Service temporarily unavailable. Try again in a moment.";
    default:
      return undefined;
  }
}
