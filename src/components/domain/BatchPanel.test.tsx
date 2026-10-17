import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BatchPanel } from "@/components/domain/BatchPanel";
import { ApiError } from "@/lib/errors";
import { renderWithProviders } from "@/test/utils";

const api = vi.hoisted(() => ({
  createBatch: vi.fn(),
  fetchBatch: vi.fn(),
  fetchBatchEvents: vi.fn(),
  fetchBatchReport: vi.fn(),
  fetchBatches: vi.fn(),
  cancelBatch: vi.fn(),
}));

vi.mock("@/lib/api", () => api);
vi.mock("@/lib/use-polling", () => ({ usePollingEnabled: () => true }));

const flowCounts = {
  flow1: { released: 1, waiting: 0, in_yard: 0, shipped: 0 },
  flow2: { cases: 0, open: 0, resolved: 0, escalated: 0 },
  flow3: { pass: 0, review: 0, fail: 0 },
  flow4: { pass: 0, fail: 0, disagreements: 0 },
  flow5: { pass: 0, rework: 0, shipped: 0 },
  flow6: { test_requests: 0, generated: 0, status: "not_triggered" },
  flow7: { runs: 0, failures: 0, status: "not_triggered" },
};

function detail(status: "running" | "done") {
  return {
    batch_id: "BAT-0001",
    status,
    engine: "mock",
    requested_cars: 3,
    created_cars: 3,
    finished_cars: status === "done" ? 3 : 1,
    progress: status === "done" ? 100 : 42,
    created_at: "2026-01-01T00:00:00Z",
    started_at: "2026-01-01T00:00:00Z",
    finished_at: status === "done" ? "2026-01-01T00:01:00Z" : null,
    message: "Cars in the plant",
    seed: 7,
    incident_enabled: true,
    incident_vin: "VIN-M01-3",
    job_id: "JOB-MOCK-1",
    flow_counts: flowCounts,
    cars: [
      {
        vin: "VIN-M01-1",
        truck_id: "T-1",
        expected: { kind: "clean" },
        state: "test_track",
        stage: 4,
        location: "test_track",
        slot: null,
        gate_verdict: "PASS",
        report_verdict: null,
        updated_at: "2026-01-01T00:00:30Z",
      },
    ],
    report: null,
  };
}

const report = {
  batch_id: "BAT-0001",
  status: "done",
  engine: "mock",
  generated_at: "2026-01-01T00:01:00Z",
  model: "mock-feedback",
  batch_size: 3,
  counts: { requested: 3, created: 3, finished: 3, shipped: 2, rework: 1, exceptions: 1 },
  flow_kpis: {},
  labels: { total: 3, caught: 2, missed: 0, false_alarms: 0, cars: [] },
  gemini: {
    batch_size: 3,
    summary: "All three sample cars completed the plant.",
    per_flow: Array.from({ length: 7 }, (_, index) => ({
      flow: index + 1,
      name: `Flow ${index + 1}`,
      observation: `Observed flow ${index + 1}.`,
      issues: [],
      recommendation: "",
    })),
    top_issues: [],
    recommendations: ["Keep gate lighting consistent."],
    risk: "low",
    degraded: false,
  },
  log: { events: 24, exceptions: 1 },
  duration_s: 60,
};

describe("BatchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.createBatch.mockResolvedValue({
      batch_id: "BAT-0001",
      job_id: "JOB-MOCK-1",
      status: "queued",
      requested_cars: 3,
      created_cars: 3,
    });
    api.fetchBatch.mockResolvedValue(detail("running"));
    api.fetchBatchEvents.mockResolvedValue({ items: [], next_since: 0, has_more: false });
    api.fetchBatchReport.mockResolvedValue(report);
    api.fetchBatches.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, last_page: 1 },
    });
    api.cancelBatch.mockResolvedValue({ batch_id: "BAT-0001", status: "cancelled" });
  });

  it("creates a batch and shows running progress and all seven flows", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BatchPanel />);
    await user.click(screen.getByRole("button", { name: "Run batch" }));
    expect(api.createBatch.mock.calls[0]?.[0]).toEqual({ cars: 3 });
    expect(await screen.findByText("1/3 finished · 42%")).toBeInTheDocument();
    expect(screen.getByText("7 · Adversarial")).toBeInTheDocument();
    expect(screen.getAllByText("Not triggered (no incident)")).toHaveLength(2);
  });

  it("rejects out-of-range input in the browser", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BatchPanel />);
    fireEvent.change(screen.getByLabelText("Cars in this batch"), { target: { value: "7" } });
    await user.click(screen.getByRole("button", { name: "Run batch" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a whole number from 1 to 6.");
    expect(api.createBatch).not.toHaveBeenCalled();
  });

  it("shows Gemini report after completion and asks before cancelling", async () => {
    const user = userEvent.setup();
    api.fetchBatch.mockResolvedValue(detail("done"));
    renderWithProviders(<BatchPanel />);
    await user.click(screen.getByRole("button", { name: "Run batch" }));
    expect(
      await screen.findByText("All three sample cars completed the plant."),
    ).toBeInTheDocument();
    expect(screen.getByText("Caught 2 · missed 0 · false alarms 0")).toBeInTheDocument();
    await waitFor(() => expect(api.fetchBatchReport).toHaveBeenCalledWith("BAT-0001"));
    expect(screen.getByRole("button", { name: /Download JSON/ })).toBeInTheDocument();
  });

  it("confirms cancellation before calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BatchPanel />);
    await user.click(screen.getByRole("button", { name: "Run batch" }));
    await user.click(await screen.findByRole("button", { name: "Cancel batch" }));
    expect(screen.getByText("Cancel this batch?")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Cancel batch" }).at(-1)!);
    expect(api.cancelBatch.mock.calls[0]?.[0]).toBe("BAT-0001");
  });

  it("explains the disabled state instead of showing the bare 503", async () => {
    api.createBatch.mockRejectedValue(
      new ApiError({
        status: 503,
        kind: "unavailable",
        code: "batch_disabled",
        message: "CARLA batch runs are disabled",
      }),
    );
    const user = userEvent.setup();
    renderWithProviders(<BatchPanel />);

    await user.click(screen.getByRole("button", { name: "Run batch" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/need the CARLA host/);
    expect(alert).toHaveTextContent(/MARSHAL_BATCH=1/);
  });
});
