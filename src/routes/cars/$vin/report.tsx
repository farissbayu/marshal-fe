import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { InspectionVerdictBadge, StatusBadge } from "@/components/common/StatusBadge";
import { ReviewForm } from "@/components/domain/ReviewForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchCarReport, fetchProposals, markReworkDone } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { ReworkTicket } from "@/lib/schemas";
import { useAuthStore } from "@/lib/stores/auth";

export const Route = createFileRoute("/cars/$vin/report")({
  component: CarReportPage,
});

function CarReportPage() {
  const { vin } = Route.useParams();
  const actor = useAuthStore((s) => s.actor);
  const queryClient = useQueryClient();

  const report = useQuery({ queryKey: ["report", vin], queryFn: () => fetchCarReport(vin) });
  const reworkProposals = useQuery({
    queryKey: ["proposals", "rework", "pending"],
    queryFn: () => fetchProposals({ kind: "rework", status: "pending" }),
    enabled: actor?.role === "supervisor",
  });

  const markDone = useMutation({
    mutationFn: (ticketVin: string) =>
      markReworkDone(ticketVin, { actor_id: actor?.actor_id ?? "" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["report", vin] });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  if (report.isLoading) return <LoadingDetail />;
  if (report.isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Report ${vin}`}
          breadcrumbs={[
            { label: "Cars", to: "/cars" },
            { label: vin, to: "/cars/$vin" },
          ]}
        />
        <ErrorPanel
          error={report.error}
          onRetry={() => report.refetch()}
          title="Gagal memuat report"
        />
      </div>
    );
  }

  const data = report.data;
  if (!data) return null;
  const pendingProposal = reworkProposals.data?.items.find((p) => p.vin === vin);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Report ${data.vin}`}
        breadcrumbs={[
          { label: "Cars", to: "/cars" },
          { label: data.vin, to: "/cars/$vin", params: { vin: data.vin } },
          { label: "Report" },
        ]}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link to="/cars/$vin" params={{ vin: data.vin }}>
              Detail Mobil
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <InspectionVerdictBadge verdict={data.verdict} />
          <span className="text-sm text-fg-muted">{data.summary}</span>
          <span className="ml-auto text-xs text-fg-subtle">
            {data.confirmed_by
              ? `Dikonfirmasi ${data.confirmed_by} · ${formatDateTime(data.confirmed_at ?? "")}`
              : "Belum dikonfirmasi"}
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Visual Findings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.visual_findings.length === 0 && (
              <p className="text-xs text-fg-subtle">Tidak ada temuan visual.</p>
            )}
            {data.visual_findings.map((finding, index) => (
              <div
                key={`${finding.zone}-${index}`}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-2 p-2"
              >
                <div>
                  <p className="text-sm text-fg">
                    <span className="font-mono">{finding.zone}</span> · {finding.defect_type}
                  </p>
                  <p className="text-xs text-fg-muted">{finding.observation}</p>
                </div>
                {finding.media_id && (
                  <div className="w-28 shrink-0">
                    <EvidenceViewer mediaId={finding.media_id} compact />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failed Functional Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.functional_failures.length === 0 && (
              <p className="text-xs text-fg-subtle">Tidak ada kegagalan fungsional.</p>
            )}
            {data.functional_failures.map((step) => (
              <div key={step.step} className="rounded-md border border-danger/30 bg-danger/5 p-2">
                <p className="text-sm text-fg">
                  {step.name} {step.disagree && <span className="text-danger">· DISAGREE</span>}
                </p>
                <p className="text-xs text-fg-muted">
                  Telemetry: {step.telemetry ?? "—"} · Kamera: {step.camera_result ?? "—"}
                </p>
                <p className="text-xs text-fg-subtle">{step.observation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rework Tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.rework_tickets.length === 0 && (
            <p className="text-xs text-fg-subtle">Tidak ada tiket rework.</p>
          )}
          {data.rework_tickets.map((ticket) => (
            <ReworkTicketRow
              key={ticket.ticket_id}
              ticket={ticket}
              canMarkDone={actor?.role === "worker" && ticket.status !== "DONE"}
              pending={markDone.isPending}
              error={markDone.isError ? markDone.error : null}
              onMarkDone={() => markDone.mutate(ticket.vin)}
            />
          ))}

          {pendingProposal && actor?.role === "supervisor" && (
            <ReviewForm
              proposalId={pendingProposal.proposal_id}
              kind="rework"
              title={`Konfirmasi Rework ${pendingProposal.proposal_id}`}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reinspection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <StatusBadge status={data.reinspection_status} />
            {data.reinspection_status === "WAITING" && (
              <span className="text-xs text-fg-muted">
                Menunggu hasil reinspection — tidak diasumsikan PASS.
              </span>
            )}
          </div>
          <p className="mt-2 text-[10px] text-fg-subtle">
            Update terakhir {formatRelative(data.updated_at)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ReworkTicketRow({
  ticket,
  canMarkDone,
  pending,
  error,
  onMarkDone,
}: {
  ticket: ReworkTicket;
  canMarkDone: boolean;
  pending: boolean;
  error: unknown;
  onMarkDone: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2 p-3">
      <span className="font-mono text-sm text-fg">{ticket.ticket_id}</span>
      <span className="text-xs text-fg-muted">{ticket.kind}</span>
      <span className="font-mono text-xs text-fg-subtle">{ticket.bay}</span>
      <StatusBadge status={ticket.status} />
      {ticket.done_by && <span className="text-xs text-fg-subtle">oleh {ticket.done_by}</span>}
      <span className="ml-auto text-[10px] text-fg-subtle">
        {formatRelative(ticket.updated_at)}
      </span>
      {canMarkDone && (
        <Button size="sm" variant="success" disabled={pending} onClick={onMarkDone}>
          Tandai Selesai
        </Button>
      )}
      {error != null && <p className="w-full text-xs text-danger">{getErrorMessage(error)}</p>}
    </div>
  );
}
