import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { VehicleStatusBadge } from "@/components/common/StatusBadge";
import { FunctionalInspectionPanel } from "@/components/domain/FunctionalInspectionPanel";
import { VehicleActions } from "@/components/domain/VehicleActions";
import { VisualInspectionPanel } from "@/components/domain/VisualInspectionPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchCar, fetchFunctionalInspection, fetchVisualInspection } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { formatDateTime, formatRelative } from "@/lib/format";

type CarTab = "ringkasan" | "visual" | "functional";

export const Route = createFileRoute("/cars/$vin/")({
  validateSearch: (search: Record<string, unknown>): { tab?: CarTab } => {
    const tab = search.tab;
    return tab === "visual" || tab === "functional" || tab === "ringkasan"
      ? { tab }
      : { tab: undefined };
  },
  component: CarDetailPage,
});

function CarDetailPage() {
  const { vin } = Route.useParams();
  const { tab = "ringkasan" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const car = useQuery({ queryKey: ["car", vin], queryFn: () => fetchCar(vin) });
  const visual = useQuery({
    queryKey: ["car", vin, "visual"],
    queryFn: () => fetchVisualInspection(vin),
    enabled: tab === "visual",
    retry: false,
  });
  const functional = useQuery({
    queryKey: ["car", vin, "functional"],
    queryFn: () => fetchFunctionalInspection(vin),
    enabled: tab === "functional",
    retry: false,
  });

  if (car.isLoading) return <LoadingDetail />;
  if (car.isError) {
    return (
      <div className="space-y-4">
        <PageHeader title={`Car ${vin}`} breadcrumbs={[{ label: "Cars", to: "/cars" }]} />
        <ErrorPanel
          error={car.error}
          onRetry={() => car.refetch()}
          title="Gagal memuat detail mobil"
        />
      </div>
    );
  }

  const detail = car.data;
  if (!detail) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title={detail.vin}
        breadcrumbs={[{ label: "Cars", to: "/cars" }, { label: detail.vin }]}
        description={detail.build_sheet.model}
        actions={
          <>
            <VehicleActions car={detail} />
            <Button asChild variant="secondary" size="sm">
              <Link to="/cars/$vin/report" params={{ vin: detail.vin }}>
                Laporan Lengkap
              </Link>
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={(value) => navigate({ search: { tab: value as CarTab } })}>
        <TabsList>
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="visual">Inspeksi Visual</TabsTrigger>
          <TabsTrigger value="functional">Functional Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="ringkasan">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Kendaraan</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Status">
                <VehicleStatusBadge state={detail.state} />
              </Field>
              <Field label="Lokasi">{detail.location}</Field>
              <Field label="Mission">
                {detail.mission ? <span className="font-mono">{detail.mission}</span> : "—"}
              </Field>
              <Field label="Truck">
                {detail.truck_id ? <span className="font-mono">{detail.truck_id}</span> : "—"}
              </Field>
              <Field label="Slot">{detail.slot ?? "—"}</Field>
              <Field label="Flags">
                <div className="flex flex-wrap gap-1">
                  {detail.flags.length
                    ? detail.flags.map((flag) => (
                        <Badge key={flag} variant="outline" className="text-[10px]">
                          {flag}
                        </Badge>
                      ))
                    : "—"}
                </div>
              </Field>
              <Field label="Build Sheet">
                {detail.build_sheet.model} · {detail.build_sheet.trim} · {detail.build_sheet.color}
              </Field>
              <Field label="Opsi">
                <div className="flex flex-wrap gap-1">
                  {detail.build_sheet.options.map((option) => (
                    <Badge key={option} variant="outline" className="text-[10px]">
                      {option}
                    </Badge>
                  ))}
                </div>
              </Field>
              <Field label="Dibuat">{formatDateTime(detail.created_at)}</Field>
              <Field label="Update terakhir">{formatRelative(detail.updated_at)}</Field>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visual">
          <Card>
            <CardHeader>
              <CardTitle>Inspeksi Visual</CardTitle>
            </CardHeader>
            <CardContent>
              {visual.isLoading && <p className="text-xs text-fg-subtle">Memuat…</p>}
              {visual.isError &&
                (isNotFound(visual.error) ? (
                  <p className="text-sm text-fg-muted">
                    Belum ada hasil inspeksi visual untuk VIN ini.
                  </p>
                ) : (
                  <ErrorPanel error={visual.error} onRetry={() => visual.refetch()} compact />
                ))}
              {visual.data && <VisualInspectionPanel inspection={visual.data} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functional">
          <Card>
            <CardHeader>
              <CardTitle>Functional Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              {functional.isLoading && <p className="text-xs text-fg-subtle">Memuat…</p>}
              {functional.isError &&
                (isNotFound(functional.error) ? (
                  <p className="text-sm text-fg-muted">
                    Belum ada hasil inspeksi fungsional untuk VIN ini.
                  </p>
                ) : (
                  <ErrorPanel
                    error={functional.error}
                    onRetry={() => functional.refetch()}
                    compact
                  />
                ))}
              {functional.data && <FunctionalInspectionPanel inspection={functional.data} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface-2 p-3">
      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="mt-1 text-sm text-fg">{children}</div>
    </div>
  );
}

function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "not_found";
}
