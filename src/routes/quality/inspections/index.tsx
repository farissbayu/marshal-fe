import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type Column, DataTable } from "@/components/common/DataTable";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterBar, FilterField, SearchInput } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { InspectionVerdictBadge, StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchInspectionKpis, fetchInspectionResults } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { formatRelative } from "@/lib/format";
import type { InspectionResult } from "@/lib/schemas";
import { usePollingEnabled } from "@/lib/use-polling";

interface InspectionsSearch {
  kind?: "visual" | "functional";
  verdict?: "PASS" | "REVIEW" | "FAIL";
  review_status?: string;
  vin?: string;
  page?: number;
}

export const Route = createFileRoute("/quality/inspections/")({
  validateSearch: (search: Record<string, unknown>): InspectionsSearch => ({
    kind: search.kind === "visual" || search.kind === "functional" ? search.kind : undefined,
    verdict:
      search.verdict === "PASS" || search.verdict === "REVIEW" || search.verdict === "FAIL"
        ? search.verdict
        : undefined,
    review_status: typeof search.review_status === "string" ? search.review_status : undefined,
    vin: typeof search.vin === "string" ? search.vin : undefined,
    page: Number(search.page) > 0 ? Number(search.page) : undefined,
  }),
  component: InspectionsPage,
});

function InspectionsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pollingEnabled = usePollingEnabled();

  const kpis = useQuery({
    queryKey: ["inspection", "kpis"],
    queryFn: fetchInspectionKpis,
    refetchInterval: pollingEnabled ? 30_000 : false,
  });
  const query = useQuery({
    queryKey: ["inspection", "results", search],
    queryFn: () =>
      fetchInspectionResults({
        ...search,
        page: search.page ?? 1,
        limit: 20,
      }),
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });

  const setFilter = (patch: Partial<InspectionsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const columns: Column<InspectionResult>[] = [
    {
      key: "vin",
      header: "VIN",
      render: (r) => <span className="font-mono text-fg">{r.vin}</span>,
    },
    {
      key: "kind",
      header: "Jenis",
      render: (r) => (r.kind === "visual" ? "Visual" : "Functional"),
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (r) => <InspectionVerdictBadge verdict={r.verdict} />,
    },
    {
      key: "findings",
      header: "Findings",
      render: (r) =>
        r.kind === "visual" ? `${r.finding_count} temuan` : `${r.failed_check_count} gagal`,
    },
    {
      key: "review",
      header: "Review",
      render: (r) => <StatusBadge status={r.review_status} />,
    },
    {
      key: "time",
      header: "Waktu",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-fg-subtle">{formatRelative(r.at)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quality & Inspections"
        description="Queue hasil inspeksi visual dan fungsional dengan verdict dan status review."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="First-pass Yield"
          value={kpis.data?.first_pass_yield ?? 0}
          unit="%"
          tone="success"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Review Share"
          value={kpis.data?.review_share ?? 0}
          unit="%"
          tone="warning"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Failure Count"
          value={kpis.data?.failure_count ?? 0}
          tone="danger"
          loading={kpis.isLoading}
        />
      </div>

      {query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <FilterBar>
            <FilterField label="Jenis">
              <Select
                value={search.kind ?? "all"}
                onValueChange={(v) =>
                  setFilter({ kind: v === "all" ? undefined : (v as "visual") })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Semua jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis</SelectItem>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Verdict">
              <Select
                value={search.verdict ?? "all"}
                onValueChange={(v) =>
                  setFilter({ verdict: v === "all" ? undefined : (v as "PASS") })
                }
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Semua verdict" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua verdict</SelectItem>
                  <SelectItem value="PASS">PASS</SelectItem>
                  <SelectItem value="REVIEW">REVIEW</SelectItem>
                  <SelectItem value="FAIL">FAIL</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Review">
              <Select
                value={search.review_status ?? "all"}
                onValueChange={(v) => setFilter({ review_status: v === "all" ? undefined : v })}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="ESCALATED">Escalated</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <SearchInput
              label="VIN"
              value={search.vin ?? ""}
              onChange={(v) => setFilter({ vin: v || undefined })}
              placeholder="VIN-001"
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
            getRowKey={(r) => r.result_id}
            onRowClick={(r) =>
              navigate({
                to: "/quality/inspections/$vin",
                params: { vin: r.vin },
                search: { kind: r.kind },
              })
            }
            loading={query.isLoading}
            empty={
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                Tidak ada hasil inspeksi yang cocok dengan filter ini.
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
  );
}
