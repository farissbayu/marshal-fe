import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cctv, Loader2, RefreshCw, Truck as TruckIcon } from "lucide-react";
import { useState } from "react";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { type Column, DataTable } from "@/components/common/DataTable";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterBar, FilterField, SearchInput } from "@/components/common/FilterBar";
import { KpiCard } from "@/components/common/KpiCard";
import { PageHeader } from "@/components/common/PageHeader";
import { VehicleStatusBadge } from "@/components/common/StatusBadge";
import { PlantCameraFeed } from "@/components/domain/PlantCameraFeed";
import { VehicleActions } from "@/components/domain/VehicleActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchYard, loadTruck, setZoneClosure, updateTruckEta } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import type { CarSummary, Truck, Yard, Zone } from "@/lib/schemas";
import { CAR_STATE_LABEL } from "@/lib/status";
import { usePollingEnabled } from "@/lib/use-polling";

interface YardSearch {
  status?: string;
  location?: string;
  flags?: string;
  truck?: string;
}

export const Route = createFileRoute("/yard/")({
  validateSearch: (search: Record<string, unknown>): YardSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    location: typeof search.location === "string" ? search.location : undefined,
    flags: typeof search.flags === "string" ? search.flags : undefined,
    truck: typeof search.truck === "string" ? search.truck : undefined,
  }),
  component: YardPage,
});

function YardPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pollingEnabled = usePollingEnabled();
  const query = useQuery({
    queryKey: ["yard"],
    queryFn: fetchYard,
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });
  const [showCctv, setShowCctv] = useState(false);

  const yard = query.data;
  const locations = Array.from(new Set((yard?.cars ?? []).map((c) => c.location))).sort();
  const filteredCars = (yard?.cars ?? []).filter((car) => {
    if (search.status && car.state !== search.status) return false;
    if (search.location && car.location !== search.location) return false;
    if (search.truck && car.truck_id !== search.truck) return false;
    if (search.flags && !search.flags.split(",").every((f) => car.flags.includes(f))) return false;
    return true;
  });

  const setFilter = (patch: Partial<YardSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const columns: Column<CarSummary>[] = [
    {
      key: "vin",
      header: "VIN",
      render: (car) => <span className="font-mono text-fg">{car.vin}</span>,
    },
    { key: "state", header: "Status", render: (car) => <VehicleStatusBadge state={car.state} /> },
    { key: "location", header: "Lokasi", render: (car) => car.location, hideOnMobile: true },
    {
      key: "mission",
      header: "Mission",
      hideOnMobile: true,
      render: (car) =>
        car.mission ? <span className="font-mono text-xs">{car.mission}</span> : "—",
    },
    {
      key: "truck",
      header: "Truck",
      hideOnMobile: true,
      render: (car) =>
        car.truck_id ? <span className="font-mono text-xs">{car.truck_id}</span> : "—",
    },
    { key: "slot", header: "Slot", hideOnMobile: true, render: (car) => car.slot ?? "—" },
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
    {
      key: "actions",
      header: "Aksi",
      render: (car) => <VehicleActions car={car} compact />,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Yard"
        description="Kondisi yard, panel truck, dan aksi operasional. Semua aksi memerlukan konfirmasi."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCctv((v) => !v)}>
              <Cctv className="size-3.5" /> {showCctv ? "Sembunyikan CCTV" : "CCTV Mini"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
              <RefreshCw className="size-3.5" /> Refresh
            </Button>
          </>
        }
      />

      {query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Mobil"
              value={yard?.summary.total ?? 0}
              loading={query.isLoading}
            />
            <KpiCard
              label="Exception"
              value={yard?.summary.exception ?? 0}
              tone="danger"
              loading={query.isLoading}
            />
            <KpiCard
              label="Held"
              value={yard?.summary.held ?? 0}
              tone="warning"
              loading={query.isLoading}
            />
            <KpiCard
              label="Zone Closed"
              value={yard?.summary.zones_closed ?? 0}
              loading={query.isLoading}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              <FilterBar>
                <FilterField label="Status">
                  <Select
                    value={search.status ?? "all"}
                    onValueChange={(v) => setFilter({ status: v === "all" ? undefined : v })}
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
                <FilterField label="Lokasi">
                  <Select
                    value={search.location ?? "all"}
                    onValueChange={(v) => setFilter({ location: v === "all" ? undefined : v })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Semua lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua lokasi</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <SearchInput
                  label="Flags"
                  value={search.flags ?? ""}
                  placeholder="mis. held,rework"
                  onChange={(v) => setFilter({ flags: v || undefined })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ search: {} })}
                  className="mb-0.5"
                >
                  Reset filter
                </Button>
              </FilterBar>

              <DataTable
                columns={columns}
                data={filteredCars}
                getRowKey={(car) => car.vin}
                onRowClick={(car) => navigate({ to: "/cars/$vin", params: { vin: car.vin } })}
                loading={query.isLoading}
                empty={
                  <p className="px-4 py-8 text-center text-sm text-fg-muted">
                    Tidak ada mobil yang cocok dengan filter ini.
                  </p>
                }
              />
            </div>

            <TruckPanel />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ZonePanel zones={yard?.zones ?? []} loading={query.isLoading} />
            <BayPanel bays={yard?.bays ?? []} loading={query.isLoading} />
          </div>
        </>
      )}

      {showCctv && (
        <div className="fixed bottom-4 right-4 z-30 w-80 shadow-2xl">
          <PlantCameraFeed />
        </div>
      )}
    </div>
  );
}

function TruckPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["yard"],
    queryFn: fetchYard,
    select: (data) => data.trucks,
  });
  const [etaTarget, setEtaTarget] = useState<Truck | null>(null);
  const [loadTarget, setLoadTarget] = useState<Truck | null>(null);
  const [etaValue, setEtaValue] = useState("");
  const [etaReason, setEtaReason] = useState("");

  const etaMutation = useMutation({
    mutationFn: ({ truckId, eta, reason }: { truckId: string; eta: string; reason?: string }) =>
      updateTruckEta(truckId, { eta, reason }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yard"] });
      setEtaTarget(null);
      setEtaValue("");
      setEtaReason("");
    },
  });
  const loadMutation = useMutation({
    mutationFn: (truckId: string) => loadTruck(truckId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yard"] });
      await queryClient.invalidateQueries({ queryKey: ["cars"] });
      setLoadTarget(null);
    },
  });

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TruckIcon className="size-4 text-fg-muted" aria-hidden />
          Panel Truck
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && <p className="text-xs text-fg-subtle">Memuat…</p>}
        {(query.data ?? []).map((truck) => {
          const delay = truck.delay_minutes ?? 0;
          return (
            <div
              key={truck.truck_id}
              className="space-y-2 rounded-md border border-border bg-surface-2 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-fg">{truck.truck_id}</span>
                <Badge variant={delay > 10 ? "danger" : delay > 0 ? "warning" : "success"}>
                  {delay > 0 ? `Delay ${delay} mnt` : "On time"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-fg-subtle">
                <span>
                  Scheduled: {truck.scheduled_eta ? formatRelative(truck.scheduled_eta) : "—"}
                </span>
                <span>Actual: {truck.actual_eta ? formatRelative(truck.actual_eta) : "—"}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {truck.assigned_vins.map((vin) => (
                  <Badge key={vin} variant="outline" className="font-mono text-[10px]">
                    {vin}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setEtaTarget(truck)}>
                  Update ETA
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setLoadTarget(truck)}>
                  Load Truck
                </Button>
              </div>
              {etaMutation.isError && etaTarget?.truck_id === truck.truck_id && (
                <p className="text-xs text-danger">{getErrorMessage(etaMutation.error)}</p>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={!!etaTarget} onOpenChange={(o) => !o && setEtaTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update ETA truck {etaTarget?.truck_id}</DialogTitle>
            <DialogDescription>Masukkan ETA aktual baru dan alasan perubahan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="eta-value">ETA aktual</Label>
              <Input
                id="eta-value"
                type="datetime-local"
                value={etaValue}
                onChange={(e) => setEtaValue(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="eta-reason">Alasan</Label>
              <Textarea
                id="eta-reason"
                rows={2}
                value={etaReason}
                onChange={(e) => setEtaReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setEtaTarget(null)}
              disabled={etaMutation.isPending}
            >
              Batal
            </Button>
            <Button
              disabled={!etaValue || etaMutation.isPending}
              onClick={() =>
                etaTarget &&
                etaMutation.mutate({
                  truckId: etaTarget.truck_id,
                  eta: new Date(etaValue).toISOString(),
                  reason: etaReason || undefined,
                })
              }
            >
              {etaMutation.isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Simpan ETA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!loadTarget}
        onOpenChange={(o) => !o && setLoadTarget(null)}
        title={`Load truck ${loadTarget?.truck_id}?`}
        description={
          <span>
            Sistem akan memuat kendaraan yang memenuhi syarat. Kendaraan yang belum siap akan
            ditolak oleh backend.
          </span>
        }
        confirmLabel="Load truck"
        pending={loadMutation.isPending}
        onConfirm={() => loadTarget && loadMutation.mutate(loadTarget.truck_id)}
      />
    </Card>
  );
}

function ZonePanel({ zones, loading }: { zones: Zone[]; loading: boolean }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ zone, closed }: { zone: string; closed: boolean }) =>
      setZoneClosure(zone, { closed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["yard"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zone Closures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-xs text-fg-subtle">Memuat…</p>}
        {zones.map((zone) => (
          <div
            key={zone.zone}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 p-2"
          >
            <div>
              <p className="text-sm text-fg">{zone.name ?? zone.zone}</p>
              <p className="font-mono text-[10px] text-fg-subtle">{zone.zone}</p>
              {zone.closed && zone.reason && (
                <p className="text-[10px] text-warning">{zone.reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={zone.closed ? "danger" : "success"}>
                {zone.closed ? "CLOSED" : "OPEN"}
              </Badge>
              <Button
                size="sm"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ zone: zone.zone, closed: !zone.closed })}
              >
                {zone.closed ? "Buka" : "Tutup"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BayPanel({ bays, loading }: { bays: Yard["bays"]; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rework Bays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && <p className="text-xs text-fg-subtle">Memuat…</p>}
        {bays.map((bay) => {
          const status = bay.status ?? (bay.occupied >= bay.capacity ? "full" : "open");
          return (
            <div
              key={bay.bay_id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-2 p-2"
            >
              <div>
                <p className="text-sm text-fg">{bay.name ?? bay.bay_id}</p>
                <p className="text-[10px] text-fg-subtle">
                  {bay.occupied}/{bay.capacity} slot terpakai
                </p>
              </div>
              <Badge
                variant={
                  status === "full" ? "danger" : status === "near_full" ? "warning" : "success"
                }
              >
                {status === "full" ? "FULL" : status === "near_full" ? "NEAR FULL" : "OPEN"}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
