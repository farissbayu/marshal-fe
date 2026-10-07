import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, Play, X } from "lucide-react";
import { useState } from "react";
import { ActorBadge } from "@/components/common/ActorBadge";
import { ErrorPanel } from "@/components/common/ErrorPanel";
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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={result.verdict === "ROBUST" ? "success" : "danger"}>{result.verdict}</Badge>
        <span className="text-xs text-fg-muted">{result.runs} run</span>
        {result.smallest_failing_variant && (
          <span className="text-xs text-danger">
            Failing variant: {result.smallest_failing_variant}
          </span>
        )}
      </div>
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
