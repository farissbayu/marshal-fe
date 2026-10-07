import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { type Column, DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorPanel } from "@/components/common/ErrorPanel";
import { FilterBar, FilterField } from "@/components/common/FilterBar";
import { JobStatusPanel } from "@/components/common/JobStatusPanel";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createScenario,
  fetchReleases,
  fetchTestRequests as fetchRequests,
  fetchScenarios,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import type { Release, Scenario, TestRequest } from "@/lib/schemas";

type LabTab = "requests" | "scenarios" | "releases";

export const Route = createFileRoute("/lab/")({
  validateSearch: (search: Record<string, unknown>): { tab?: LabTab } => ({
    tab:
      search.tab === "scenarios" || search.tab === "releases" || search.tab === "requests"
        ? search.tab
        : "requests",
  }),
  component: LabPage,
});

function LabPage() {
  const { tab = "requests" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Test Lab"
        description="Alur kerja engineer: permintaan uji, skenario, adversarial search, dan release gate."
      />
      <Tabs value={tab} onValueChange={(value) => navigate({ search: { tab: value as LabTab } })}>
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "requests" && <RequestsTab />}
      {tab === "scenarios" && <ScenariosTab />}
      {tab === "releases" && <ReleasesTab />}
    </div>
  );
}

function RequestsTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [situation, setSituation] = useState("");
  const [source, setSource] = useState("manual");
  const [activeJob, setActiveJob] = useState<string | null>(null);

  const requests = useQuery({
    queryKey: ["lab", "requests"],
    queryFn: () => fetchRequests({ limit: 50 }),
  });

  const create = useMutation({
    mutationFn: () => createScenario({ situation, source }),
    onSuccess: (data) => {
      setActiveJob(data.job_id);
      setSituation("");
    },
  });

  const columns: Column<TestRequest>[] = [
    {
      key: "id",
      header: "ID",
      render: (r) => <span className="font-mono text-fg">{r.request_id}</span>,
    },
    { key: "source", header: "Source", render: (r) => r.source, hideOnMobile: true },
    { key: "text", header: "Deskripsi", render: (r) => <span className="text-xs">{r.text}</span> },
    {
      key: "time",
      header: "Waktu",
      hideOnMobile: true,
      render: (r) => formatRelative(r.created_at),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.scenario_id && (
            <Link
              to="/lab/scenarios/$scenarioId"
              params={{ scenarioId: r.scenario_id }}
              className="text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {r.scenario_id} →
            </Link>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Generate Scenario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="situation">Deskripsi situasi (bahasa alami)</Label>
            <Textarea
              id="situation"
              rows={3}
              value={situation}
              onChange={(e) => setSituation(e.target.value)}
              placeholder="mis. Kendaraan berhenti karena forklift melintas di jalur keluar."
            />
          </div>
          <div className="space-y-1">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual input</SelectItem>
                <SelectItem value="case-01">Assistance case-01</SelectItem>
                <SelectItem value="case-02">Assistance case-02</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {create.isError && <p className="text-xs text-danger">{getErrorMessage(create.error)}</p>}
          <Button
            disabled={create.isPending || situation.trim().length < 5}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Mengirim…" : "Generate Scenario"}
          </Button>
          <p className="text-[11px] text-fg-subtle">
            Submit berjalan asinkron dan tidak memblokir halaman. Anda dapat membuat request baru
            sambil job berjalan.
          </p>
        </CardContent>
      </Card>

      {activeJob && (
        <JobStatusPanel
          jobId={activeJob}
          onComplete={async (job) => {
            await queryClient.invalidateQueries({ queryKey: ["lab", "requests"] });
            await queryClient.invalidateQueries({ queryKey: ["lab", "scenarios"] });
            if (job.status === "done") {
              const refreshed = await fetchRequests({ limit: 50 });
              const converted = refreshed.items.find((r) => r.scenario_id);
              if (converted?.scenario_id) {
                navigate({
                  to: "/lab/scenarios/$scenarioId",
                  params: { scenarioId: converted.scenario_id },
                });
              }
            }
          }}
        />
      )}

      {requests.isError ? (
        <ErrorPanel error={requests.error} onRetry={() => requests.refetch()} />
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-fg">Daftar Test Requests</h3>
          <DataTable
            columns={columns}
            data={requests.data?.items ?? []}
            getRowKey={(r) => r.request_id}
            loading={requests.isLoading}
            empty={<EmptyState title="Belum ada test request" />}
          />
        </div>
      )}
    </div>
  );
}

function ScenariosTab() {
  const [status, setStatus] = useState<string>("all");
  const query = useQuery({
    queryKey: ["lab", "scenarios", status],
    queryFn: () => fetchScenarios({ status: status === "all" ? undefined : status, limit: 50 }),
  });

  const columns: Column<Scenario>[] = [
    {
      key: "id",
      header: "ID",
      render: (s) => <span className="font-mono text-fg">{s.scenario_id}</span>,
    },
    { key: "source", header: "Source", hideOnMobile: true, render: (s) => s.source },
    {
      key: "summary",
      header: "Ringkasan",
      render: (s) => <span className="text-xs">{s.summary}</span>,
    },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    {
      key: "tags",
      header: "Tags",
      hideOnMobile: true,
      render: (s) => s.tags.join(", ") || "—",
    },
    { key: "owner", header: "Owner", hideOnMobile: true, render: (s) => s.owner },
    {
      key: "time",
      header: "Waktu",
      hideOnMobile: true,
      render: (s) => formatRelative(s.created_at),
    },
  ];

  return (
    <div className="space-y-3">
      <FilterBar>
        <FilterField label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="dry_run_running">Dry-run</SelectItem>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="runnable">Runnable</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      </FilterBar>

      {query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          getRowKey={(s) => s.scenario_id}
          loading={query.isLoading}
          empty={<EmptyState title="Belum ada skenario" />}
        />
      )}
    </div>
  );
}

function ReleasesTab() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["lab", "releases"],
    queryFn: () => fetchReleases({ limit: 50 }),
  });

  const columns: Column<Release>[] = [
    {
      key: "id",
      header: "Release",
      render: (r) => <span className="font-mono text-fg">{r.release_id}</span>,
    },
    {
      key: "eval",
      header: "Evaluasi Terakhir",
      render: (r) => (
        <span className="flex items-center gap-2">
          <StatusBadge status={r.evaluation_status} />
          {(r.passed > 0 || r.failed > 0) && (
            <span className="text-xs text-fg-subtle">
              {r.passed} pass / {r.failed} fail
            </span>
          )}
        </span>
      ),
    },
    { key: "gate", header: "Gate", render: (r) => <StatusBadge status={r.gate} /> },
    {
      key: "time",
      header: "Updated",
      hideOnMobile: true,
      render: (r) => formatRelative(r.updated_at),
    },
  ];

  return query.isError ? (
    <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
  ) : (
    <DataTable
      columns={columns}
      data={query.data?.items ?? []}
      getRowKey={(r) => r.release_id}
      onRowClick={(r) =>
        navigate({ to: "/lab/releases/$releaseId", params: { releaseId: r.release_id } })
      }
      loading={query.isLoading}
      empty={<EmptyState title="Belum ada release" />}
    />
  );
}
