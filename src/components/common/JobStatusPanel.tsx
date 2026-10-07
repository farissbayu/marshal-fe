import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchJob } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { Job } from "@/lib/schemas";
import { usePollingEnabled } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

const TERMINAL = new Set(["done", "failed", "timeout", "unknown"]);
const TIMEOUT_MS = 10 * 60 * 1000;

export function JobStatusPanel({
  jobId,
  onComplete,
  className,
}: {
  jobId: string;
  onComplete?: (job: Job) => void;
  className?: string;
}) {
  const pollingEnabled = usePollingEnabled();
  const startedAt = useRef(Date.now());
  const completedRef = useRef(false);

  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      if (status && TERMINAL.has(status)) return false;
      if (!pollingEnabled) return false;
      return 3000;
    },
  });

  const job = query.data;
  const timedOut = Date.now() - startedAt.current > TIMEOUT_MS && job && !TERMINAL.has(job.status);

  useEffect(() => {
    if (job && TERMINAL.has(job.status) && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(job);
    }
  }, [job, onComplete]);

  if (query.isError) {
    return (
      <div className={cn("rounded-lg border border-warning/40 bg-warning/10 p-3", className)}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-fg">Status pekerjaan tidak diketahui</p>
            <p className="text-xs text-fg-muted">{getErrorMessage(query.error)}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-lg border border-border bg-surface-2 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {(job?.status === "running" || job?.status === "queued") && (
            <Loader2 className="size-4 animate-spin text-info" aria-hidden />
          )}
          <span className="font-mono text-xs text-fg-muted">{jobId}</span>
          <StatusBadge status={job?.status ?? "queued"} />
        </div>
        {job?.progress !== undefined && job.status === "running" && (
          <span className="tabular text-xs text-fg-muted">{job.progress}%</span>
        )}
      </div>
      <Progress value={job?.progress ?? 0} />
      {job?.message && <p className="text-xs text-fg-muted">{job.message}</p>}
      {job?.status === "failed" && job.error && <p className="text-xs text-danger">{job.error}</p>}
      {timedOut && (
        <div className="flex items-center justify-between gap-2 rounded border border-warning/40 bg-warning/10 p-2">
          <p className="text-xs text-fg-muted">Pekerjaan melebihi batas waktu.</p>
          <Button size="sm" variant="secondary" onClick={() => query.refetch()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      )}
      <p className="text-[10px] text-fg-subtle" role="status" aria-live="polite">
        {pollingEnabled ? "Polling aktif (3 dtk)" : "Polling dijeda (tab tidak aktif)"}
      </p>
    </div>
  );
}
