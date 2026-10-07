import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type Column, DataTable } from "@/components/common/DataTable";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterBar, FilterField, SearchInput } from "@/components/common/FilterBar";
import { PageHeader } from "@/components/common/PageHeader";
import { VehicleStatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchCars } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { formatRelative } from "@/lib/format";
import type { CarSummary } from "@/lib/schemas";
import { CAR_STATE_LABEL } from "@/lib/status";
import { usePollingEnabled } from "@/lib/use-polling";

interface CarsSearch {
  q?: string;
  state?: string;
  location?: string;
  truck?: string;
  flags?: string;
  page?: number;
}

export const Route = createFileRoute("/cars/")({
  validateSearch: (search: Record<string, unknown>): CarsSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    location: typeof search.location === "string" ? search.location : undefined,
    truck: typeof search.truck === "string" ? search.truck : undefined,
    flags: typeof search.flags === "string" ? search.flags : undefined,
    page: Number(search.page) > 0 ? Number(search.page) : undefined,
  }),
  component: CarsPage,
});

function CarsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pollingEnabled = usePollingEnabled();

  const query = useQuery({
    queryKey: ["cars", search],
    queryFn: () =>
      fetchCars({
        q: search.q,
        state: search.state,
        location: search.location,
        truck: search.truck,
        flags: search.flags,
        page: search.page ?? 1,
        limit: 20,
        sort: "updated",
      }),
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });

  const setFilter = (patch: Partial<CarsSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, page: undefined }) });

  const columns: Column<CarSummary>[] = [
    {
      key: "vin",
      header: "VIN",
      render: (car) => <span className="font-mono text-fg">{car.vin}</span>,
    },
    { key: "model", header: "Model", hideOnMobile: true, render: (car) => car.model ?? "—" },
    { key: "state", header: "Status", render: (car) => <VehicleStatusBadge state={car.state} /> },
    { key: "location", header: "Lokasi", render: (car) => car.location },
    {
      key: "truck",
      header: "Truck",
      hideOnMobile: true,
      render: (car) =>
        car.truck_id ? <span className="font-mono text-xs">{car.truck_id}</span> : "—",
    },
    {
      key: "flags",
      header: "Flags",
      hideOnMobile: true,
      render: (car) =>
        car.flags.length ? (
          <div className="flex flex-wrap gap-1">
            {car.flags.map((flag) => (
              <Badge key={flag} variant="outline" className="text-[10px]">
                {flag}
              </Badge>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "updated",
      header: "Updated",
      hideOnMobile: true,
      render: (car) => (
        <span className="text-xs text-fg-subtle">{formatRelative(car.updated_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cars"
        description="Pencarian dan penelusuran seluruh kendaraan di plant."
      />

      {query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <FilterBar>
            <SearchInput
              label="Cari VIN / model"
              value={search.q ?? ""}
              onChange={(v) => setFilter({ q: v || undefined })}
              placeholder="VIN-001"
            />
            <FilterField label="Status">
              <Select
                value={search.state ?? "all"}
                onValueChange={(v) => setFilter({ state: v === "all" ? undefined : v })}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  {Object.entries(CAR_STATE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <SearchInput
              label="Lokasi"
              value={search.location ?? ""}
              onChange={(v) => setFilter({ location: v || undefined })}
              placeholder="ZONE-A"
            />
            <SearchInput
              label="Flags"
              value={search.flags ?? ""}
              onChange={(v) => setFilter({ flags: v || undefined })}
              placeholder="rework"
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
            getRowKey={(car) => car.vin}
            onRowClick={(car) => navigate({ to: "/cars/$vin", params: { vin: car.vin } })}
            loading={query.isLoading}
            empty={
              <p className="px-4 py-8 text-center text-sm text-fg-muted">
                Tidak ada mobil yang cocok dengan filter ini.
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
