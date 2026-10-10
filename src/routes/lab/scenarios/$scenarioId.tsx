import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Play, X } from "lucide-react";
import { useState } from "react";
import { ActorBadge } from "@/components/common/ActorBadge";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { JobStatusPanel } from "@/components/common/JobStatusPanel";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchScenario, reviewScenario, startAdversarialSearch } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { roleLabel } from "@/lib/role";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/scenarios/$scenarioId")({
  component: ScenarioDetailPage,
});

function ScenarioDetailPage() {
  const { scenarioId } = Route.useParams();
  const actor = useAuthStore((s) => s.actor);
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["lab", "scenario", scenarioId],
    queryFn: () => fetchScenario(scenarioId),
  });

  const adversarial = useMutation({
    mutationFn: () => startAdversarialSearch(scenarioId),
    onSuccess: (data) => setActiveJob(data.job_id),
  });

  if (query.isLoading) return <LoadingDetail />;
  if (query.isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Scenario ${scenarioId}`}
          breadcrumbs={[{ label: "Test Lab", to: "/lab" }, { label: scenarioId }]}
        />
        <ErrorPanel
          error={query.error}
          onRetry={() => query.refetch()}
          title="Gagal memuat skenario"
        />
      </div>
    );
  }

  const scenario = query.data;
  if (!scenario) return null;
  const canReview = scenario.status === "pending_review" && actor?.role === "engineer";
  const isRunnable = scenario.status === "approved" || scenario.status === "runnable";

  return (
    <div className="space-y-5">
      <PageHeader
        title={scenario.scenario_id}
        breadcrumbs={[
          { label: "Test Lab", to: "/lab" },
          { label: "Scenarios", to: "/lab" },
          { label: scenario.scenario_id },
        ]}
        description={scenario.summary}
        actions={
          <>
            <StatusBadge status={scenario.status} />
            <Badge variant="outline">Source: {scenario.source}</Badge>
            <Badge variant="outline">Owner: {scenario.owner}</Badge>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spec (read-only)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] text-fg-muted">
              {JSON.stringify(scenario.spec, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validator Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {scenario.validator_notes.length === 0 && (
                <p className="text-xs text-fg-subtle">Tidak ada catatan.</p>
              )}
              {scenario.validator_notes.map((note, i) => (
                <p key={i} className="flex items-start gap-2 text-xs text-fg-muted">
                  {note.severity === "ok" && (
                    <Check className="mt-0.5 size-3.5 text-success" aria-hidden />
                  )}
                  {note.severity === "warning" && (
                    <AlertTriangle className="mt-0.5 size-3.5 text-warning" aria-hidden />
                  )}
                  {note.severity === "error" && (
                    <X className="mt-0.5 size-3.5 text-danger" aria-hidden />
                  )}
                  {note.message}
                </p>
              ))}
            </CardContent>
          </Card>

          {scenario.dry_run_metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Dry-run Metrics</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {Object.entries(scenario.dry_run_metrics).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] uppercase tracking-wide text-fg-subtle">{key}</p>
                    <p className="font-mono text-sm text-fg">{value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {scenario.review && (
            <Card>
              <CardHeader>
                <CardTitle>Review Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-fg-muted">
                <div className="flex items-center gap-2">
                  <StatusBadge status={scenario.review.decision} />
                  <ActorBadge actorId={scenario.review.actor_id} />
                  <span className="text-fg-subtle">{formatDateTime(scenario.review.at)}</span>
                </div>
                {scenario.review.note && <p>{scenario.review.note}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {canReview && <ScenarioReviewForm scenarioId={scenarioId} onDone={() => query.refetch()} />}

      {isRunnable && (
        <Card>
          <CardHeader>
            <CardTitle>Adversarial Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!scenario.adversarial_result && (
              <Button disabled={adversarial.isPending} onClick={() => adversarial.mutate()}>
                {adversarial.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-3.5" />
                )}
                Mulai Adversarial Search
              </Button>
            )}
            {adversarial.isError && (
              <p className="text-xs text-danger">{getErrorMessage(adversarial.error)}</p>
            )}
            {activeJob && (
              <JobStatusPanel
                jobId={activeJob}
                onComplete={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: ["lab", "scenario", scenarioId],
                  });
                }}
              />
            )}
            {scenario.adversarial_result && (
              <AdversarialResult result={scenario.adversarial_result} />
            )}
          </CardContent>
        </Card>
      )}

      <Button asChild variant="ghost" size="sm">
        <Link to="/lab" search={{ tab: "scenarios" }}>
          ← Kembali ke daftar skenario
        </Link>
      </Button>
    </div>
  );
}

function ScenarioReviewForm({ scenarioId, onDone }: { scenarioId: string; onDone: () => void }) {
  const actor = useAuthStore((s) => s.actor);
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      reviewScenario(scenarioId, {
        decision,
        actor_id: actor?.actor_id ?? "",
        note: note || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lab", "scenario", scenarioId] });
      await queryClient.invalidateQueries({ queryKey: ["lab", "scenarios"] });
      onDone();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Review Skenario
          <span className="ml-auto">
            <ActorBadge
              actorId={actor?.actor_id}
              role={actor ? roleLabel(actor.role) : undefined}
            />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="scenario-note">Catatan (opsional)</Label>
          <Textarea
            id="scenario-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={mutation.isPending}
          />
        </div>
        {mutation.isError && (
          <p className="text-xs text-danger">{getErrorMessage(mutation.error)}</p>
        )}
        <div className="flex gap-2">
          <Button
            variant="success"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("approved")}
          >
            {mutation.isPending && mutation.variables === "approved" && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            )}
            Setujui Skenario
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("rejected")}
          >
            {mutation.isPending && mutation.variables === "rejected" && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            )}
            Tolak Skenario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AdversarialResult({
  result,
}: {
  result: NonNullable<Awaited<ReturnType<typeof fetchScenario>>["adversarial_result"]>;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const variants = result.variants ?? [];
  const selectedVariant =
    variants.find((v) => v.variant_id === selectedVariantId) ??
    (result.smallest_failing_variant
      ? variants.find((v) => v.variant_id === result.smallest_failing_variant || !v.passed)
      : variants[0]);

  const lights = ["noon", "dusk", "night"];
  const distances = Array.from(
    new Set(
      variants.map((v) => v.trigger_distance_m).filter((d): d is number => typeof d === "number"),
    ),
  ).sort((a, b) => b - a);

  const failureReport = result.failure_report;
  const failureClipId = failureReport?.clip_id || result.media_ids?.[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={result.verdict === "ROBUST" ? "success" : "danger"}>{result.verdict}</Badge>
        <span className="text-xs text-fg-muted">{result.runs} run dievaluasi</span>
        {result.smallest_failing_variant && (
          <span className="text-xs font-semibold text-danger">
            Failing variant terkecil: {result.smallest_failing_variant}
          </span>
        )}
      </div>

      {/* Matriks Variasi Adversarial (Variant Grid) */}
      {variants.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-fg">
              Matriks Variasi Adversarial (Pencahayaan × Jarak Pemicu)
            </span>
            <span className="text-[11px] text-fg-subtle">
              Klik sel untuk melihat detail variasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-2 font-mono text-fg-subtle">Cahaya \ Jarak</th>
                  {distances.map((dist) => (
                    <th key={dist} className="p-2 text-center font-mono text-fg-subtle">
                      {dist} m
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lights.map((light) => (
                  <tr key={light} className="border-b border-border/50">
                    <td className="p-2 font-medium capitalize text-fg">{light}</td>
                    {distances.map((dist) => {
                      const match = variants.find(
                        (v) =>
                          v.light.toLowerCase() === light.toLowerCase() &&
                          v.trigger_distance_m === dist,
                      );
                      if (!match) {
                        return (
                          <td key={dist} className="p-2 text-center text-fg-subtle">
                            —
                          </td>
                        );
                      }
                      const isSelected = selectedVariant?.variant_id === match.variant_id;
                      return (
                        <td key={dist} className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedVariantId(match.variant_id)}
                            className={cn(
                              "w-full rounded px-2 py-1 font-mono text-[11px] font-medium transition-all",
                              match.passed
                                ? "bg-success/15 text-success hover:bg-success/25"
                                : "border border-danger/60 bg-danger/20 font-bold text-danger hover:bg-danger/30",
                              isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-bg",
                            )}
                            title={`Variant: ${match.variant_id} | Gap: ${match.min_gap_m ?? "—"}m | Occluder: ${match.occluder ?? "none"}`}
                          >
                            {match.min_gap_m !== undefined
                              ? `${match.min_gap_m}m`
                              : match.passed
                                ? "PASS"
                                : "FAIL"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedVariant && (
            <div className="mt-2 rounded border border-border bg-bg p-2 text-xs text-fg-muted">
              <span className="font-semibold text-fg">{selectedVariant.variant_id}:</span> Cahaya:{" "}
              <span className="font-mono capitalize">{selectedVariant.light}</span> · Jarak:{" "}
              <span className="font-mono">{selectedVariant.trigger_distance_m ?? "—"} m</span> ·
              Occluder: <span className="font-mono">{selectedVariant.occluder ?? "none"}</span> ·
              Kecepatan:{" "}
              <span className="font-mono">{selectedVariant.ego_speed_kmh ?? "—"} km/h</span> ·
              Status:{" "}
              <span
                className={cn(
                  "font-semibold",
                  selectedVariant.passed ? "text-success" : "text-danger",
                )}
              >
                {selectedVariant.passed ? "PASS" : "FAIL"} (Gap: {selectedVariant.min_gap_m ?? "—"}
                m)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Laporan Kegagalan & Replay Clip (Flow 7 Failure Report) */}
      {(failureReport || result.verdict === "FRAGILE" || failureClipId) && (
        <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-4">
          <div className="flex items-center gap-2">
            <Badge variant="danger">Laporan Kegagalan Adversarial</Badge>
            {failureReport?.variant_id && (
              <span className="font-mono text-xs font-semibold text-fg">
                {failureReport.variant_id}
              </span>
            )}
          </div>

          {failureReport?.summary && (
            <p className="text-xs font-medium text-fg">{failureReport.summary}</p>
          )}

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            {failureReport?.conditions && (
              <div className="rounded bg-surface-2 p-2">
                <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                  Kondisi Pengujian
                </span>
                <span className="text-fg">{failureReport.conditions}</span>
              </div>
            )}
            {failureReport?.measured_gap_m !== undefined && (
              <div className="rounded bg-surface-2 p-2">
                <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                  Jarak Berhenti Terukur vs Batas
                </span>
                <span className="font-mono font-semibold text-danger">
                  {failureReport.measured_gap_m} m{" "}
                  <span className="text-fg-subtle">
                    (batas {failureReport.limit_gap_m ?? 1.5} m)
                  </span>
                </span>
              </div>
            )}
            {failureReport?.likely_cause && (
              <div className="rounded bg-surface-2 p-2">
                <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                  Kemungkinan Penyebab
                </span>
                <span className="text-fg">{failureReport.likely_cause}</span>
              </div>
            )}
            {failureReport?.suggested_fix && (
              <div className="rounded bg-surface-2 p-2">
                <span className="block text-[10px] uppercase tracking-wide text-fg-subtle">
                  Rekomendasi Perbaikan
                </span>
                <span className="text-success">{failureReport.suggested_fix}</span>
              </div>
            )}
          </div>

          {failureClipId && (
            <div className="mt-2 space-y-1">
              <span className="text-[11px] font-medium text-fg-muted">
                Rekaman Replay Kegagalan (Video CARLA):
              </span>
              <div className="max-w-md">
                <EvidenceViewer
                  mediaId={failureClipId}
                  label={failureReport?.variant_id ?? "Failure Clip"}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {result.criteria && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-surface-2">
              <TableHead>Criteria</TableHead>
              <TableHead>Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(result.criteria).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="text-fg">{key}</TableCell>
                <TableCell className="font-mono">{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {result.metrics && (
        <div className="flex flex-wrap gap-4">
          {Object.entries(result.metrics).map(([key, value]) => (
            <div key={key}>
              <p className="text-[10px] uppercase tracking-wide text-fg-subtle">{key}</p>
              <p className="font-mono text-sm text-fg">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
