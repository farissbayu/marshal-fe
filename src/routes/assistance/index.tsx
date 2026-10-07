import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, LifeBuoy, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WaitingTimeBadge } from "@/components/common/WaitingTimeBadge";
import { Button } from "@/components/ui/button";
import { fetchAssistanceCases, fetchAssistanceKpis } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { usePollingEnabled } from "@/lib/use-polling";

export const Route = createFileRoute("/assistance/")({
  component: AssistanceListPage,
});

function AssistanceListPage() {
  const pollingEnabled = usePollingEnabled();
  const cases = useQuery({
    queryKey: ["assistance", "open"],
    queryFn: () => fetchAssistanceCases({ open: true, limit: 50 }),
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });
  const kpis = useQuery({
    queryKey: ["assistance", "kpis"],
    queryFn: fetchAssistanceKpis,
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assistance"
        description="Kasus keselamatan dengan prioritas tertinggi. Kendaraan berhenti sampai manusia memilih opsi."
        actions={
          <Button variant="secondary" size="sm" onClick={() => cases.refetch()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Open Cases"
          value={kpis.data?.open ?? 0}
          tone="danger"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Resolved"
          value={kpis.data?.resolved ?? 0}
          tone="success"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Rata-rata Latency"
          value={kpis.data?.avg_latency_minutes ?? 0}
          unit="mnt"
          loading={kpis.isLoading}
        />
      </div>

      {cases.isError ? (
        <ErrorPanel error={cases.error} onRetry={() => cases.refetch()} />
      ) : cases.isLoading ? (
        <p className="text-xs text-fg-subtle">Memuat…</p>
      ) : (cases.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="Tidak ada assistance case terbuka"
          description="Semua kasus telah diselesaikan atau tidak ada permintaan bantuan saat ini."
          icon={<LifeBuoy className="size-6" aria-hidden />}
        />
      ) : (
        <div className="space-y-2">
          {cases.data?.items.map((c) => (
            <Link
              key={c.case_id}
              to="/assistance/$case_id"
              params={{ case_id: c.case_id }}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong"
            >
              {c.moving_people_or_equipment ? (
                <AlertTriangle
                  className="size-5 shrink-0 text-danger"
                  aria-label="Orang atau peralatan bergerak"
                />
              ) : (
                <LifeBuoy className="size-5 shrink-0 text-fg-subtle" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">
                  <span className="font-mono">{c.vin}</span> · {c.situation}
                </p>
                <p className="text-xs text-fg-subtle">
                  {c.location}
                  {c.moving_people_or_equipment && (
                    <span className="ml-2 text-danger">Orang/peralatan bergerak</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                <WaitingTimeBadge createdAt={c.opened_at} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
