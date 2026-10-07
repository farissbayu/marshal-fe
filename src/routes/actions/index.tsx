import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { type Column, DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WaitingTimeBadge } from "@/components/common/WaitingTimeBadge";
import { ReviewForm } from "@/components/domain/ReviewForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchProposals } from "@/lib/api";
import { POLL_INTERVAL_MS } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import type { Proposal, ProposalKind } from "@/lib/schemas";
import { usePollingEnabled } from "@/lib/use-polling";

const KIND_LABEL: Record<ProposalKind, string> = {
  replan: "Re-plan",
  inspection_review: "Inspection Review",
  rework: "Rework",
};

export const Route = createFileRoute("/actions/")({
  validateSearch: (search: Record<string, unknown>): { kind?: ProposalKind; status?: string } => ({
    kind:
      search.kind === "replan" || search.kind === "inspection_review" || search.kind === "rework"
        ? search.kind
        : undefined,
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: ActionCenterPage,
});

function ActionCenterPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const kind: ProposalKind = search.kind ?? "replan";
  const pollingEnabled = usePollingEnabled();
  const [selected, setSelected] = useState<Proposal | null>(null);

  const query = useQuery({
    queryKey: ["proposals", kind, "pending"],
    queryFn: () => fetchProposals({ kind, status: "pending", limit: 50 }),
    refetchInterval: pollingEnabled ? POLL_INTERVAL_MS : false,
  });

  const columns: Column<Proposal>[] = [
    {
      key: "id",
      header: "Proposal ID",
      render: (p) => <span className="font-mono text-fg">{p.proposal_id}</span>,
    },
    { key: "vin", header: "VIN", render: (p) => <span className="font-mono">{p.vin ?? "—"}</span> },
    { key: "category", header: "Kategori", render: (p) => p.category, hideOnMobile: true },
    {
      key: "summary",
      header: "Ringkasan",
      render: (p) => <span className="text-xs">{p.summary}</span>,
    },
    {
      key: "wait",
      header: "Waktu Tunggu",
      render: (p) => <WaitingTimeBadge createdAt={p.created_at} />,
    },
    { key: "status", header: "Status", render: (p) => <StatusBadge status={p.status} /> },
    {
      key: "detail",
      header: "",
      render: (p) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(p);
          }}
        >
          Buka Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Action Center"
        description="Antrean keputusan manusia, terpisah dari rekomendasi AI. Setiap aksi memakai tombol spesifik."
        actions={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        }
      />

      <Tabs
        value={kind}
        onValueChange={(value) => navigate({ search: { kind: value as ProposalKind } })}
      >
        <TabsList>
          {(Object.keys(KIND_LABEL) as ProposalKind[]).map((value) => (
            <TabsTrigger key={value} value={value}>
              {KIND_LABEL[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <p className="text-xs text-fg-subtle">Memuat…</p>
      ) : (query.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title={`Tidak ada proposal ${KIND_LABEL[kind].toLowerCase()} yang menunggu`}
          description="Semua keputusan untuk kategori ini sudah selesai."
        />
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          getRowKey={(p) => p.proposal_id}
          onRowClick={(p) => setSelected(p)}
        />
      )}

      <ProposalDetailDialog proposal={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProposalDetailDialog({
  proposal,
  onClose,
}: {
  proposal: Proposal | null;
  onClose: () => void;
}) {
  if (!proposal) return null;
  const isSupervisorAction = proposal.kind !== "inspection_review";

  return (
    <Dialog open={!!proposal} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {proposal.proposal_id} · {proposal.category}
          </DialogTitle>
          <DialogDescription>
            {proposal.vin && <span className="font-mono">{proposal.vin}</span>} · Dibuat{" "}
            {formatDateTime(proposal.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-fg-muted">{proposal.summary}</p>

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-subtle">Payload</p>
            <pre className="max-h-48 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] text-fg-muted">
              {JSON.stringify(proposal.payload, null, 2)}
            </pre>
          </div>

          {proposal.effects && (
            <div className="grid gap-2 sm:grid-cols-2">
              {proposal.effects.approve && (
                <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs text-fg-muted">
                  <span className="block text-success">Jika disetujui</span>
                  {proposal.effects.approve}
                </div>
              )}
              {proposal.effects.reject && (
                <div className="rounded-md border border-danger/30 bg-danger/5 p-2 text-xs text-fg-muted">
                  <span className="block text-danger">Jika ditolak</span>
                  {proposal.effects.reject}
                </div>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-fg-subtle">
              Aksi yang diizinkan (dari backend)
            </p>
            <div className="flex flex-wrap gap-1">
              {proposal.allowed_actions.map((action) => (
                <StatusBadge key={action} status={action} />
              ))}
            </div>
          </div>

          {proposal.status === "pending" ? (
            <ReviewForm
              proposalId={proposal.proposal_id}
              kind={isSupervisorAction ? proposal.kind : "inspection_review"}
              title="Keputusan"
              onSuccess={onClose}
            />
          ) : (
            <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-fg-muted">
              Proposal sudah diputuskan:{" "}
              <span className="font-mono text-fg">{proposal.decision}</span> oleh{" "}
              <span className="font-mono">{proposal.decided_by ?? "—"}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
