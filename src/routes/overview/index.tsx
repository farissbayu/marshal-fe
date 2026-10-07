import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ClipboardList, FlaskConical, LifeBuoy, Warehouse } from "lucide-react";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge, VehicleStatusBadge } from "@/components/common/StatusBadge";
import { WaitingTimeBadge } from "@/components/common/WaitingTimeBadge";
import { LiveActivityFeed } from "@/components/domain/LiveActivityFeed";
import { PlantCameraFeed } from "@/components/domain/PlantCameraFeed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchKpis, fetchOverview } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { formatRelative } from "@/lib/format";
import { usePollingEnabled } from "@/lib/use-polling";

export const Route = createFileRoute("/overview/")({
  component: OverviewPage,
});

function OverviewPage() {
  const pollingEnabled = usePollingEnabled();

  const kpis = useQuery({
    queryKey: ["kpis"],
    queryFn: fetchKpis,
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });
  const overview = useQuery({
    queryKey: ["overview"],
    queryFn: fetchOverview,
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Ringkasan shift, monitoring CCTV live, dan aliran aktivitas AI (Flow 1–7)."
      />

      {kpis.isError && <ErrorPanel error={kpis.error} onRetry={() => kpis.refetch()} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <KpiCard key={i} label="" value="" loading />)
          : (kpis.data?.items ?? []).map((kpi) => (
              <KpiCard
                key={kpi.key}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
                tone={kpi.tone}
                trend={kpi.trend}
              />
            ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PlantCameraFeed />
        <LiveActivityFeed className="h-[26rem]" />
      </div>

      {overview.isError ? (
        <ErrorPanel error={overview.error} onRetry={() => overview.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AttentionColumn overview={overview.data} loading={overview.isLoading} />
          <YardOperationsColumn overview={overview.data} loading={overview.isLoading} />
        </div>
      )}

      <LabSummary overview={overview.data} loading={overview.isLoading} />
    </div>
  );
}

function AttentionColumn({
  overview,
  loading,
}: {
  overview?: Awaited<ReturnType<typeof fetchOverview>>;
  loading: boolean;
}) {
  const assistance = overview?.attention.assistance ?? [];
  const proposals = overview?.attention.proposals ?? [];
  const total = assistance.length + proposals.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-warning" aria-hidden />
          Butuh Tindakan Segera
          <span className="ml-auto font-mono text-xs text-fg-subtle">{total}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-xs text-fg-subtle">Memuat…</p>}
        {!loading && total === 0 && (
          <p className="text-xs text-fg-subtle">Tidak ada keputusan manusia yang menunggu.</p>
        )}
        {assistance.map((c) => (
          <Link
            key={c.case_id}
            to="/assistance/$case_id"
            params={{ case_id: c.case_id }}
            className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-2 transition-colors hover:border-border-strong"
          >
            <LifeBuoy className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">
                <span className="font-mono">{c.vin}</span> · {c.situation}
              </p>
              <p className="text-xs text-fg-subtle">{c.location}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={c.status} />
              <WaitingTimeBadge createdAt={c.opened_at} />
            </div>
          </Link>
        ))}
        {proposals.map((p) => (
          <Link
            key={p.proposal_id}
            to="/actions"
            search={{ kind: p.kind, status: "pending" }}
            className="flex items-start gap-2 rounded-md border border-border bg-surface-2 p-2 transition-colors hover:border-border-strong"
          >
            <ClipboardList className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-fg">
                {p.vin ? <span className="font-mono">{p.vin}</span> : p.category} · {p.summary}
              </p>
              <p className="text-xs text-fg-subtle">{p.category}</p>
            </div>
            <WaitingTimeBadge createdAt={p.created_at} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function YardOperationsColumn({
  overview,
  loading,
}: {
  overview?: Awaited<ReturnType<typeof fetchOverview>>;
  loading: boolean;
}) {
  const exceptions = overview?.yard_exceptions ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse className="size-4 text-info" aria-hidden />
          Operasi Yard & Exceptions
          <span className="ml-auto font-mono text-xs text-fg-subtle">{exceptions.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-xs text-fg-subtle">Memuat…</p>}
        {!loading && exceptions.length === 0 && (
          <p className="text-xs text-fg-subtle">Tidak ada exception atau kendaraan tertahan.</p>
        )}
        {exceptions.map((car) => (
          <Link
            key={car.vin}
            to="/cars/$vin"
            params={{ vin: car.vin }}
            className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2 transition-colors hover:border-border-strong"
          >
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm text-fg">{car.vin}</p>
              <p className="truncate text-xs text-fg-subtle">
                {car.location}
                {car.flags.length > 0 ? ` · ${car.flags.join(", ")}` : ""}
              </p>
            </div>
            <VehicleStatusBadge state={car.state} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

function LabSummary({
  overview,
  loading,
}: {
  overview?: Awaited<ReturnType<typeof fetchOverview>>;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="size-4 text-fg-muted" aria-hidden />
          Ringkasan Test Lab
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        {loading ? (
          <p className="text-xs text-fg-subtle">Memuat…</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted">Skenario menunggu review:</span>
              <span className="font-mono text-lg text-warning">
                {overview?.lab.scenarios_pending_review ?? 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted">Release terblokir:</span>
              <span className="font-mono text-lg text-danger">
                {overview?.lab.releases_blocked ?? 0}
              </span>
            </div>
            <Button asChild variant="secondary" size="sm" className="ml-auto">
              <Link to="/lab" search={{ tab: "scenarios" }}>
                Buka Test Lab
              </Link>
            </Button>
            <span className="text-[10px] text-fg-subtle">
              Data per {overview ? formatRelative(new Date(overview.updated_at)) : "—"}
            </span>
          </>
        )}
      </CardContent>
    </Card>
  );
}
