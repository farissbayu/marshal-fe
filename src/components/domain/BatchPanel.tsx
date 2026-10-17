import { useMutation, useQuery } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  cancelBatch,
  createBatch,
  fetchBatch,
  fetchBatchEvents,
  fetchBatches,
  fetchBatchReport,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { BatchEvent } from "@/lib/schemas";
import { usePollingEnabled } from "@/lib/use-polling";
import { BatchCarsTable } from "./BatchCarsTable";
import { BatchFlowCards } from "./BatchFlowCards";
import { BatchLog } from "./BatchLog";
import { BatchReportCard } from "./BatchReportCard";

/** The API answers 503 `batch_disabled` when it is not attached to a CARLA host. */
function batchDisabled(error: unknown): boolean {
  return (error as { code?: string } | null | undefined)?.code === "batch_disabled";
}

function batchErrorText(error: unknown): string {
  if (batchDisabled(error)) {
    return (
      "Batch runs are off on this API. They run CARLA scripts, so they need the CARLA host: " +
      "start its API with MARSHAL_BATCH=1 (marshal-ai/docs/BATCH_RUN_RUNBOOK.md)."
    );
  }
  return getErrorMessage(error);
}

export function BatchPanel() {
  const pollingEnabled = usePollingEnabled();
  const [cars, setCars] = useState("3");
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const since = events.reduce((max, event) => Math.max(max, event.seq), 0);

  const batches = useQuery({
    queryKey: ["batches"],
    queryFn: () => fetchBatches({ limit: 20 }),
    refetchInterval: !activeBatchId && pollingEnabled ? 5000 : false,
  });
  const create = useMutation({
    mutationFn: createBatch,
    onSuccess: (accepted) => {
      setEvents([]);
      setActiveBatchId(accepted.batch_id);
      setFormError(null);
    },
    onError: (error) => setFormError(batchErrorText(error)),
  });
  const detail = useQuery({
    queryKey: ["batch", activeBatchId],
    queryFn: () => fetchBatch(activeBatchId as string),
    enabled: Boolean(activeBatchId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && status !== "queued" && status !== "running") return false;
      return pollingEnabled ? 2000 : false;
    },
  });
  const running = detail.data?.status === "queued" || detail.data?.status === "running";
  const eventQuery = useQuery({
    queryKey: ["batch-events", activeBatchId, since],
    queryFn: () => fetchBatchEvents(activeBatchId as string, since),
    enabled: Boolean(activeBatchId) && Boolean(running),
    refetchInterval: pollingEnabled && running ? 2000 : false,
  });
  const report = useQuery({
    queryKey: ["batch-report", activeBatchId],
    queryFn: () => fetchBatchReport(activeBatchId as string),
    enabled: Boolean(activeBatchId) && detail.data?.status === "done",
    staleTime: Number.POSITIVE_INFINITY,
  });
  const cancel = useMutation({
    mutationFn: cancelBatch,
    onSuccess: () => {
      setCancelDialogOpen(false);
      void detail.refetch();
    },
  });

  useEffect(() => {
    if (activeBatchId) return;
    const active = batches.data?.items.find(
      (batch) => batch.status === "queued" || batch.status === "running",
    );
    if (active) setActiveBatchId(active.batch_id);
  }, [activeBatchId, batches.data]);

  useEffect(() => {
    const incoming = eventQuery.data?.items;
    if (!incoming?.length) return;
    setEvents((current) => {
      const bySeq = new Map(current.map((event) => [event.seq, event]));
      for (const event of incoming) bySeq.set(event.seq, event);
      return [...bySeq.values()].sort((a, b) => a.seq - b.seq).slice(-200);
    });
  }, [eventQuery.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const count = Number(cars);
    if (!Number.isInteger(count) || count < 1 || count > 6) {
      setFormError("Enter a whole number from 1 to 6.");
      return;
    }
    create.mutate({ cars: count });
  }

  return (
    <section id="batch-run" className="space-y-3 border-b border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Run a batch</h2>
          <p className="mt-1 text-xs text-fg-muted">
            CARLA runs 1–6 cars per batch. Other data is generated and labelled.
          </p>
        </div>
        {detail.data && (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <span className="font-mono text-xs text-fg-muted">{detail.data.batch_id}</span>
            <StatusBadge status={detail.data.status} />
          </div>
        )}
      </div>

      <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={submit}>
        <div className="w-36">
          <Label htmlFor="batch-cars">Cars in this batch</Label>
          <Input
            id="batch-cars"
            type="number"
            min={1}
            max={6}
            step={1}
            value={cars}
            onChange={(event) => setCars(event.target.value)}
            aria-describedby="batch-cars-help"
          />
        </div>
        <Button type="submit" disabled={create.isPending || Boolean(running)}>
          {create.isPending ? "Starting…" : "Run batch"}
        </Button>
        {running && activeBatchId && (
          <Button type="button" variant="danger" onClick={() => setCancelDialogOpen(true)}>
            Cancel batch
          </Button>
        )}
        <span id="batch-cars-help" className="text-[11px] text-fg-subtle">
          One CARLA batch runs at a time.
        </span>
      </form>

      {formError && (
        <p role="alert" className="text-xs text-danger">
          {formError}
        </p>
      )}
      {create.isError && !formError && (
        <p role="alert" className="text-xs text-danger">
          {batchErrorText(create.error)}
        </p>
      )}
      {detail.isError && (
        <p role="alert" className="text-xs text-danger">
          {getErrorMessage(detail.error)}
        </p>
      )}

      {detail.data && (
        <div className="space-y-3" aria-live="polite">
          <Card className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-fg-muted">{detail.data.message ?? detail.data.status}</span>
              <span className="font-mono tabular-nums text-fg">
                {detail.data.finished_cars}/{detail.data.requested_cars} finished ·{" "}
                {detail.data.progress}%
              </span>
            </div>
            <Progress className="mt-2" value={detail.data.progress} aria-label="Batch progress" />
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-fg-subtle">
              <span>Requested {detail.data.requested_cars}</span>
              <span>Created {detail.data.created_cars}</span>
              <span>Finished {detail.data.finished_cars}</span>
              <span>Shipped {detail.data.flow_counts.flow5.shipped}</span>
            </div>
          </Card>

          <BatchFlowCards counts={detail.data.flow_counts} />
          <Card className="space-y-3 p-3">
            <h3 className="text-xs font-semibold text-fg">Cars by VIN</h3>
            <BatchCarsTable cars={detail.data.cars} />
          </Card>
          <Card className="p-3">
            <BatchLog events={events} />
          </Card>
          {eventQuery.isError && (
            <p role="alert" className="text-xs text-danger">
              {getErrorMessage(eventQuery.error)}
            </p>
          )}
          {report.data && <BatchReportCard report={report.data} />}
          {report.isError && (
            <p role="alert" className="text-xs text-danger">
              {getErrorMessage(report.error)}
            </p>
          )}
        </div>
      )}

      <ConfirmActionDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel this batch?"
        description="The CARLA process will be stopped and the batch marked cancelled."
        confirmLabel="Cancel batch"
        variant="danger"
        pending={cancel.isPending}
        onConfirm={() => activeBatchId && cancel.mutate(activeBatchId)}
      />
      {cancel.isError && (
        <p role="alert" className="text-xs text-danger">
          {getErrorMessage(cancel.error)}
        </p>
      )}
    </section>
  );
}
