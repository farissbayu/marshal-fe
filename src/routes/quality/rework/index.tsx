import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type Column, DataTable } from "@/components/common/DataTable";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterBar, FilterField, SearchInput } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { InspectionVerdictBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchReports, fetchReworkBays } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { formatRelative } from "@/lib/format";
import type { Report } from "@/lib/schemas";
import { usePollingEnabled } from "@/lib/use-polling";

interface ReworkSearch {
  verdict?: "PASS" | "REVIEW" | "FAIL";
  bay?: string;
  status?: string;
  vin?: string;
  page?: number;
}

export const Route = createFileRoute("/quality/rework/")({
  validateSearch: (search: Record<string, unknown>): ReworkSearch => ({
    verdict:
      search.verdict === "PASS" || search.verdict === "REVIEW" || search.verdict === "FAIL"
        ? search.verdict
        : undefined,
    bay: typeof search.bay === "string" ? search.bay : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
    vin: typeof search.vin === "string" ? search.vin : undefined,
    page: Number(search.page) > 0 ? Number(search.page) : undefined,
  }),
  component: ReworkPage,
});

function ReworkPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pollingEnabled = usePollingEnabled();

  const query = useQuery({
    queryKey: ["reports", search],
    queryFn: () => fetchReports({ ...search, page: search.page ?? 1, limit: 20 }),
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });
  const bays = useQuery({ queryKey: ["rework", "bays"], queryFn: fetchReworkBays });

  const setFilter = (patch: Partial<ReworkSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const columns: Column<Report>[] = [
    {
      key: "vin",
      header: "VIN",
      render: (r) => <span className="font-mono text-fg">{r.vin}</span>,
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (r) => <InspectionVerdictBadge verdict={r.verdict} />,
    },
    {
      key: "bay",
      header: "Bay",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.rework_tickets.length
            ? r.rework_tickets.map((t) => (
                <Badge key={t.ticket_id} variant="outline" className="font-mono text-[10px]">
                  {t.bay}
                </Badge>
              ))
            : "—"}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.rework_tickets.length ? (
          <StatusBadge status={r.rework_tickets[0].status} />
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "reinspection",
      header: "Reinspection",
      hideOnMobile: true,
      render: (r) => <StatusBadge status={r.reinspection_status} />,
    },
    {
      key: "updated",
      header: "Updated",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-fg-subtle">{formatRelative(r.updated_at)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports & Rework"
        description="Verdict laporan, status perbaikan, dan kapasitas bay."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-3">
          {query.isError ? (
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <>
              <FilterBar>
                <FilterField label="Verdict">
                  <Select
                    value={search.verdict ?? "all"}
                    onValueChange={(v) =>
                      setFilter({ verdict: v === "all" ? undefined : (v as "PASS") })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="PASS">PASS</SelectItem>
                      <SelectItem value="REVIEW">REVIEW</SelectItem>
                      <SelectItem value="FAIL">FAIL</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Bay">
                  <Select
                    value={search.bay ?? "all"}
                    onValueChange={(v) => setFilter({ bay: v === "all" ? undefined : v })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {(bays.data?.items ?? []).map((bay) => (
                        <SelectItem key={bay.bay_id} value={bay.bay_id}>
                          {bay.bay_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Status Rework">
                  <Select
                    value={search.status ?? "all"}
                    onValueChange={(v) => setFilter({ status: v === "all" ? undefined : v })}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Semua" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="IN_REPAIR">IN_REPAIR</SelectItem>
                      <SelectItem value="DONE">DONE</SelectItem>
                      <SelectItem value="WAITING_REINSPECTION">WAITING_REINSPECTION</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <SearchInput
                  label="VIN"
                  value={search.vin ?? ""}
                  onChange={(v) => setFilter({ vin: v || undefined })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-0.5"
                  onClick={() => navigate({ search: {} })}
                >
                  Reset
                </Button>
              </FilterBar>

              <DataTable
                columns={columns}
                data={query.data?.items ?? []}
                getRowKey={(r) => r.vin}
                onRowClick={(r) => navigate({ to: "/cars/$vin/report", params: { vin: r.vin } })}
                loading={query.isLoading}
                empty={
                  <p className="px-4 py-8 text-center text-sm text-fg-muted">
                    Tidak ada report yang cocok dengan filter ini.
                  </p>
                }
                pagination={
                  query.data
                    ? {
                        ...query.data.pagination,
                        onPageChange: (page) => navigate({ search: (prev) => ({ ...prev, page }) }),
                      }
                    : undefined
                }
              />
            </>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Rework Bays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bays.isLoading && <p className="text-xs text-fg-subtle">Memuat…</p>}
            {bays.data?.items.map((bay) => {
              const status = bay.status ?? (bay.occupied >= bay.capacity ? "full" : "open");
              return (
                <div key={bay.bay_id} className="rounded-md border border-border bg-surface-2 p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-fg">{bay.name ?? bay.bay_id}</span>
                    <Badge
                      variant={
                        status === "full"
                          ? "danger"
                          : status === "near_full"
                            ? "warning"
                            : "success"
                      }
                    >
                      {status === "full" ? "FULL" : status === "near_full" ? "NEAR FULL" : "OPEN"}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-fg-subtle">
                    {bay.occupied}/{bay.capacity} slot
                    {bay.active_vins.length > 0 ? ` · ${bay.active_vins.join(", ")}` : ""}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
