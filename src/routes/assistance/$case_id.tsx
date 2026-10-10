import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";
import { ActorBadge } from "@/components/common/ActorBadge";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { RiskIndicator } from "@/components/common/RiskIndicator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WaitingTimeBadge } from "@/components/common/WaitingTimeBadge";
import { OptionRadioGroup } from "@/components/domain/OptionRadioGroup";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createScenario, decideAssistance, fetchAssistanceCase } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/stores/auth";
import { usePollingEnabled } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistance/$case_id")({
  component: AssistanceDetailPage,
});

function AssistanceDetailPage() {
  const { case_id } = Route.useParams();
  const actor = useAuthStore((s) => s.actor);
  const pollingEnabled = usePollingEnabled();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [labJobId, setLabJobId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["assistance", case_id],
    queryFn: () => fetchAssistanceCase(case_id),
    refetchInterval: (q) => {
      if (q.state.data?.status === "RESOLVED") return false;
      return pollingEnabled ? POLL_INTERVAL_MS : false;
    },
  });

  const mutation = useMutation({
    mutationFn: (option: string) =>
      decideAssistance(case_id, { option, actor_id: actor?.actor_id ?? "" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assistance"] });
      setConfirmOpen(false);
    },
  });

  const sendToLab = useMutation({
    mutationFn: () =>
      createScenario({
        situation: `Case ${data?.case_id} (${data?.vin}): ${data?.situation}`,
        source: `case-${data?.case_id}`,
      }),
    onSuccess: (res) => {
      setLabJobId(res.job_id);
      queryClient.invalidateQueries({ queryKey: ["lab"] });
    },
  });

  if (query.isLoading) return <LoadingDetail />;
  if (query.isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Case ${case_id}`}
          breadcrumbs={[{ label: "Assistance", to: "/assistance" }, { label: case_id }]}
        />
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} title="Gagal memuat case" />
      </div>
    );
  }

  const data = query.data;
  if (!data) return null;
  const resolved = data.status === "RESOLVED";
  const selectedOption = data.options.find((o) => o.id === selected);
  const recommendation = data.recommendation;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Case ${data.case_id}`}
        breadcrumbs={[{ label: "Assistance", to: "/assistance" }, { label: data.case_id }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={sendToLab.isPending || !!labJobId}
              onClick={() => sendToLab.mutate()}
              title="Kirim insiden ini ke Test Lab untuk diuji variasinya"
            >
              {sendToLab.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <FlaskConical className="size-3.5" />
              )}
              {labJobId ? "Terkirim ke Lab" : "Kirim ke Test Lab"}
            </Button>
            <StatusBadge status={data.status} />
          </div>
        }
      />

      {labJobId && (
        <div className="flex items-center justify-between rounded-md border border-info/30 bg-info/5 p-3 text-xs text-info">
          <span>
            Insiden berhasil dikirim ke Test Lab (Job: {labJobId}). Kasus ini akan dikompilasi
            menjadi skenario CARLA.
          </span>
          <Button asChild size="sm" variant="ghost" className="h-6 text-xs text-info underline">
            <Link to="/lab" search={{ tab: "requests" }}>
              Lihat di Test Lab →
            </Link>
          </Button>
        </div>
      )}

      {data.moving_people_or_equipment && (
        <RiskIndicator
          level="high"
          label={`RISIKO: ${data.risk_note ?? "Orang atau peralatan bergerak terdeteksi."}`}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Info Case</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="VIN">
                <span className="font-mono">{data.vin}</span>
              </Field>
              <Field label="Posisi">{data.location}</Field>
              <Field label="Waktu Open">
                <span className="flex items-center gap-2">
                  {formatDateTime(data.opened_at)}
                  <WaitingTimeBadge createdAt={data.opened_at} />
                </span>
              </Field>
              <Field label="Status">
                <StatusBadge status={data.status} />
              </Field>
              <Field label="Situasi" className="sm:col-span-2">
                {data.situation}
              </Field>
              {data.escalation && (
                <Field label="Eskalasi" className="sm:col-span-2">
                  {data.escalation}
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              {data.media_ids.length === 0 ? (
                <p className="text-xs text-fg-subtle">Tidak ada media untuk case ini.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.media_ids.map((mediaId) => (
                    <EvidenceViewer
                      key={mediaId}
                      mediaId={mediaId}
                      label={data.case_id}
                      boxes={data.detected_objects}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rekomendasi AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendation ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="info" className="font-mono">
                      {recommendation.option_id}
                    </Badge>
                    <span className="text-xs text-fg-muted">
                      Confidence {Math.round(recommendation.confidence * 100)}%
                    </span>
                  </div>
                  {recommendation.note && (
                    <p className="text-xs text-fg-muted">{recommendation.note}</p>
                  )}
                  <p className="rounded border border-border bg-surface-2 p-2 text-[11px] text-fg-subtle">
                    Ini adalah rekomendasi AI, bukan keputusan. Pilihan tetap milik Anda.
                  </p>
                </>
              ) : (
                <p className="text-xs text-fg-subtle">Tidak ada rekomendasi dari agent.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {resolved ? (
        <Card>
          <CardHeader>
            <CardTitle>Hasil Keputusan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-subtle">Opsi terpilih:</span>
              <Badge variant="success" className="font-mono">
                {data.chosen_option}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-fg-muted">
              <span>Resolved by</span>
              <ActorBadge actorId={data.resolved_by} />
              <span>{formatDateTime(data.resolved_at ?? "")}</span>
            </div>
            {data.result && <p className="text-sm text-fg-muted">{data.result}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Pilih Opsi (dari backend)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <OptionRadioGroup
              options={data.options}
              value={selected}
              onChange={setSelected}
              disabled={mutation.isPending}
            />

            <p className="text-[11px] text-fg-subtle">
              Actor pengirim: <span className="font-mono">{actor?.actor_id ?? "—"}</span> (dari
              sesi)
            </p>
            {mutation.isError && (
              <p className="text-xs text-danger">{getErrorMessage(mutation.error)}</p>
            )}

            <Button disabled={!selected || mutation.isPending} onClick={() => setConfirmOpen(true)}>
              Submit Keputusan
            </Button>
          </CardContent>
        </Card>
      )}

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmasi keputusan"
        description={
          <span>
            Anda memilih:{" "}
            <span className="font-mono text-fg">{selectedOption?.label ?? selected}</span>.
            Lanjutkan?
          </span>
        }
        confirmLabel="Kirim keputusan"
        pending={mutation.isPending}
        confirmDisabled={!selected}
        onConfirm={() => selected && mutation.mutate(selected)}
      />
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-surface-2 p-3", className)}>
      <p className="text-[10px] uppercase tracking-wide text-fg-subtle">{label}</p>
      <div className="mt-1 text-sm text-fg">{children}</div>
    </div>
  );
}
