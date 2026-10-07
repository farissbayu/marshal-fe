import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Loader2, Play, X } from "lucide-react";
import { useState } from "react";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { JobStatusPanel } from "@/components/common/JobStatusPanel";
import { LoadingDetail } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { approveRelease, evaluateRelease, fetchRelease } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/stores/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/releases/$releaseId")({
  component: ReleaseDetailPage,
});

function ReleaseDetailPage() {
  const { releaseId } = Route.useParams();
  const actor = useAuthStore((s) => s.actor);
  const queryClient = useQueryClient();
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useQuery({
    queryKey: ["lab", "release", releaseId],
    queryFn: () => fetchRelease(releaseId),
  });

  const evaluate = useMutation({
    mutationFn: () => evaluateRelease(releaseId),
    onSuccess: (data) => setActiveJob(data.job_id),
  });
  const approve = useMutation({
    mutationFn: () => approveRelease(releaseId, { actor_id: actor?.actor_id ?? "" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lab", "release", releaseId] });
      await queryClient.invalidateQueries({ queryKey: ["lab", "releases"] });
      setConfirmOpen(false);
    },
  });

  if (query.isLoading) return <LoadingDetail />;
  if (query.isError) {
    return (
      <div className="space-y-4">
        <PageHeader
          title={`Release ${releaseId}`}
          breadcrumbs={[{ label: "Test Lab", to: "/lab" }, { label: releaseId }]}
        />
        <ErrorPanel
          error={query.error}
          onRetry={() => query.refetch()}
          title="Gagal memuat release"
        />
      </div>
    );
  }

  const release = query.data;
  if (!release) return null;

  const gatePassed = release.gate === "approved";
  const evaluationDone = release.evaluation_status === "done";
  const isEngineer = actor?.role === "engineer";
  const canApprove = isEngineer && evaluationDone && gatePassed && release.failed === 0;
  const approveReason = !isEngineer
    ? "Hanya engineer yang dapat menyetujui release."
    : !evaluationDone
      ? "Evaluasi belum selesai."
      : release.failed > 0 || release.gate === "blocked"
        ? "Gate belum lulus — release terblokir."
        : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Release ${release.release_id}`}
        breadcrumbs={[
          { label: "Test Lab", to: "/lab" },
          { label: "Releases", to: "/lab" },
          { label: release.release_id },
        ]}
        actions={
          <>
            <StatusBadge status={release.gate} />
            <StatusBadge status={release.evaluation_status} />
            {release.approved_by && (
              <span className="text-xs text-fg-subtle">
                Approved by {release.approved_by} · {formatDateTime(release.approved_at ?? "")}
              </span>
            )}
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Evaluasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={evaluate.isPending || release.evaluation_status === "running"}
              onClick={() => evaluate.mutate()}
            >
              {evaluate.isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="size-3.5" />
              )}
              Evaluate Release
            </Button>
            <span className="text-xs text-fg-muted">
              {release.passed} pass / {release.failed} fail
            </span>
          </div>
          {evaluate.isError && (
            <p className="text-xs text-danger">{getErrorMessage(evaluate.error)}</p>
          )}
          {activeJob && (
            <JobStatusPanel
              jobId={activeJob}
              onComplete={async () => {
                await queryClient.invalidateQueries({ queryKey: ["lab", "release", releaseId] });
              }}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hasil Evaluasi</CardTitle>
        </CardHeader>
        <CardContent>
          {release.tests.length === 0 ? (
            <p className="text-xs text-fg-subtle">Belum ada hasil evaluasi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-surface-2">
                  <TableHead>Test ID</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Criteria</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {release.tests.map((test) => (
                  <TableRow key={test.test_id} className={cn(!test.passed && "bg-danger/5")}>
                    <TableCell className="font-mono text-fg">{test.test_id}</TableCell>
                    <TableCell className={cn("tabular", !test.passed && "text-danger")}>
                      {test.metric}
                    </TableCell>
                    <TableCell className="tabular">{test.criteria}</TableCell>
                    <TableCell className="tabular">{test.result}</TableCell>
                    <TableCell>
                      {test.passed ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Check className="size-3.5" aria-hidden /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-danger">
                          <X className="size-3.5" aria-hidden /> FAIL
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="success"
            disabled={!canApprove || approve.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Approve Release
          </Button>
          {approveReason && <p className="text-xs text-fg-subtle">{approveReason}</p>}
          {approve.isError && (
            <p className="text-xs text-danger">{getErrorMessage(approve.error)}</p>
          )}
          {gatePassed && release.approved_by && (
            <p className="text-xs text-success">Release telah disetujui.</p>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="ghost" size="sm">
        <Link to="/lab" search={{ tab: "releases" }}>
          ← Kembali ke daftar release
        </Link>
      </Button>

      <ConfirmActionDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Setujui release ${release.release_id}?`}
        description={
          <span>
            Anda akan menyetujui release{" "}
            <span className="font-mono text-fg">{release.release_id}</span>. Lanjutkan?
          </span>
        }
        confirmLabel="Approve release"
        variant="success"
        pending={approve.isPending}
        confirmDisabled={!canApprove}
        onConfirm={() => approve.mutate()}
      />
    </div>
  );
}
