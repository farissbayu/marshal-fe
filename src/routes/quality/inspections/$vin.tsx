import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { FunctionalInspectionPanel } from "@/components/domain/FunctionalInspectionPanel";
import { VisualInspectionPanel } from "@/components/domain/VisualInspectionPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchFunctionalInspection, fetchVisualInspection } from "@/lib/api";
import { ApiError } from "@/lib/errors";

type Kind = "visual" | "functional";

export const Route = createFileRoute("/quality/inspections/$vin")({
  validateSearch: (search: Record<string, unknown>): { kind?: Kind } => ({
    kind: search.kind === "functional" ? "functional" : "visual",
  }),
  component: InspectionDetailPage,
});

function InspectionDetailPage() {
  const { vin } = Route.useParams();
  const { kind } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const visual = useQuery({
    queryKey: ["inspection", vin, "visual"],
    queryFn: () => fetchVisualInspection(vin),
    enabled: kind === "visual",
    retry: false,
  });
  const functional = useQuery({
    queryKey: ["inspection", vin, "functional"],
    queryFn: () => fetchFunctionalInspection(vin),
    enabled: kind === "functional",
    retry: false,
  });

  const active = kind === "visual" ? visual : functional;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${vin} · ${kind === "visual" ? "Inspeksi Visual" : "Functional Checklist"}`}
        breadcrumbs={[
          { label: "Quality", to: "/quality/inspections" },
          { label: "Inspections", to: "/quality/inspections" },
          { label: vin },
        ]}
      />

      <Tabs value={kind} onValueChange={(value) => navigate({ search: { kind: value as Kind } })}>
        <TabsList>
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="functional">Functional</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          {active.isLoading && <LoadingDetail />}
          {active.isError &&
            (active.error instanceof ApiError && active.error.kind === "not_found" ? (
              <p className="text-sm text-fg-muted">
                Belum ada hasil inspeksi {kind} untuk {vin}.
              </p>
            ) : (
              <ErrorPanel error={active.error} onRetry={() => active.refetch()} compact />
            ))}
          {kind === "visual" && visual.data && <VisualInspectionPanel inspection={visual.data} />}
          {kind === "functional" && functional.data && (
            <FunctionalInspectionPanel inspection={functional.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
