import type { BatchCar, BatchEvent, BatchReport, BatchSummary } from "@/lib/schemas";
import type { MockBatch } from "../db";
import { fail, type MockRequest, paginate, strQuery } from "./helpers";

const DURATION_MS = 20_000;
// shortcut: one 20-second linear mock schedule; add per-flow timing only if demo fidelity needs it.
const FLOW_NAMES = [
  "Yard traffic",
  "Assistance",
  "Visual inspector",
  "Functional check",
  "Report and rework",
  "Scenario generator",
  "Adversarial tester",
];
const STATES = ["line_end", "inspection_gate", "test_track", "report", "yard", "shipped"];

function summary(batch: MockBatch): BatchSummary {
  const {
    batch_id,
    status,
    engine,
    requested_cars,
    created_cars,
    finished_cars,
    progress,
    created_at,
    started_at,
    finished_at,
  } = batch;
  return {
    batch_id,
    status,
    engine,
    requested_cars,
    created_cars,
    finished_cars,
    progress,
    created_at,
    started_at,
    finished_at,
  };
}

function publicBatch(batch: MockBatch) {
  const {
    progress_started_at: _clock,
    event_cursor: _cursor,
    _event_count: _events,
    ...data
  } = batch as MockBatch & { _event_count?: number };
  return data;
}

function addEvent(
  req: MockRequest,
  batch: MockBatch,
  flow: number,
  title: string,
  detail: string,
  level = "info",
) {
  let events = req.db.batchEvents[batch.batch_id];
  if (!events) events = req.db.batchEvents[batch.batch_id] = [];
  const event: BatchEvent = {
    seq: events.length + 1,
    flow,
    source: FLOW_NAMES[flow - 1] ?? "Batch service",
    title,
    detail,
    level: level as BatchEvent["level"],
    at: new Date().toISOString(),
  };
  events.push(event);
}

function mockReport(batch: MockBatch): BatchReport {
  const rework = batch.cars.filter((car) => car.state === "rework").length;
  const shipped = batch.cars.filter((car) => car.state === "shipped").length;
  const caught = batch.cars.filter((car) => car.expected.kind !== "clean").length;
  const flowNames = [
    "Yard traffic",
    "Assistance",
    "Visual inspection",
    "Functional check",
    "Report and rework",
    "Scenario generator",
    "Adversarial tester",
  ];
  return {
    batch_id: batch.batch_id,
    status: "done",
    engine: "mock",
    generated_at: batch.finished_at ?? new Date().toISOString(),
    model: "mock-feedback",
    batch_size: batch.created_cars,
    counts: {
      requested: batch.requested_cars,
      created: batch.created_cars,
      finished: batch.finished_cars,
      shipped,
      rework,
      exceptions: 2,
    },
    flow_kpis: {
      flow1: { cars_per_hour_to_yard: 12, line_to_yard_min_clean: 8.5 },
      flow2: {
        cases: batch.incident_enabled ? 1 : 0,
        resolved: batch.incident_enabled ? 1 : 0,
        escalated: 0,
      },
      flow3: {
        first_pass_yield: shipped / Math.max(batch.created_cars, 1),
        review_share: 0,
        false_alarms: 0,
      },
      flow4: {
        disagreements: batch.cars.filter((car) => car.expected.kind === "dead_lamp").length,
        failed_items: [],
      },
      flow5: {
        rework_rate: rework / Math.max(batch.created_cars, 1),
        shipped_with_open_finding: 0,
      },
      flow6: {
        status: batch.flow_counts.flow6.status,
        scenario_id: batch.incident_enabled ? "SC-MOCK-1" : null,
      },
      flow7: {
        status: batch.flow_counts.flow7.status,
        runs: batch.incident_enabled ? 4 : 0,
        robust: true,
      },
    },
    labels: {
      total: batch.created_cars,
      caught,
      missed: 0,
      false_alarms: 0,
      cars: batch.cars.map((car) => ({
        vin: car.vin,
        expected: String(car.expected.kind ?? "clean"),
        caught: car.expected.kind === "clean" ? null : true,
      })),
    },
    gemini: {
      batch_size: batch.created_cars,
      summary: `All ${batch.created_cars} sample cars completed the plant. ${caught} injected issue(s) were caught.`,
      per_flow: flowNames.map((name, index) => ({
        flow: index + 1,
        name,
        observation:
          index >= 5 && !batch.incident_enabled
            ? "Not triggered (no incident)."
            : `Mock run recorded ${FLOW_NAMES[index]} activity.`,
        issues: [],
        recommendation: "",
      })),
      top_issues: [],
      recommendations: ["Keep gate lighting consistent across the batch."],
      risk: "low",
      degraded: false,
    },
    log: {
      events: (batch as MockBatch & { _event_count?: number })._event_count ?? 24,
      exceptions: 2,
    },
    duration_s: DURATION_MS / 1000,
  };
}

function materialize(batch: MockBatch, req: MockRequest) {
  if (batch.status === "queued") {
    batch.status = "running";
    batch.started_at = new Date().toISOString();
    batch.progress_started_at = Date.now();
    batch.message = "cars released to the plant";
    addEvent(
      req,
      batch,
      1,
      "Batch started",
      `${batch.requested_cars} generated car(s) entering the plant.`,
    );
  }
  if (batch.status !== "running") return;

  const elapsed = Math.max(
    0,
    Date.now() - (batch.progress_started_at ?? Date.parse(batch.started_at ?? batch.created_at)),
  );
  batch.progress = Math.min(100, Math.floor((elapsed / DURATION_MS) * 100));
  batch.message = `${batch.finished_cars} of ${batch.requested_cars} cars finished`;

  batch.cars = batch.cars.map((car, index) => {
    const carProgress = Math.max(0, batch.progress - index * 2);
    let stageIndex = 0;
    for (const threshold of [15, 30, 45, 60, 80]) if (carProgress >= threshold) stageIndex += 1;
    const state = STATES[stageIndex] ?? "shipped";
    const expected = String(car.expected.kind ?? "clean");
    const faulted = expected === "wrong_colour" || expected === "dead_lamp";
    const finalState = state === "shipped" && faulted ? "rework" : state;
    const gate = carProgress >= 15 ? (expected === "wrong_colour" ? "FAIL" : "PASS") : null;
    const report = carProgress >= 45 ? (faulted ? "FAIL" : "PASS") : null;
    return {
      ...car,
      state: finalState,
      stage: stageIndex + 1,
      location: finalState === "rework" ? "production_control" : finalState,
      slot: stageIndex >= 4 ? `Y${index + 1}` : null,
      gate_verdict: gate,
      report_verdict: report,
      updated_at: new Date(Date.now()).toISOString(),
    };
  });

  batch.finished_cars = batch.cars.filter((car) => car.stage >= 5).length;
  const gateVerdicts = batch.cars.map((car) => car.gate_verdict).filter(Boolean);
  const reportVerdicts = batch.cars.map((car) => car.report_verdict).filter(Boolean);
  const deadLamp = batch.cars.some((car) => car.expected.kind === "dead_lamp");
  batch.flow_counts = {
    flow1: {
      released: batch.cars.filter((car) => car.stage >= 2).length,
      waiting: batch.cars.filter((car) => car.state === "line_end").length,
      in_yard: batch.cars.filter((car) => car.state === "yard" || car.state === "rework").length,
      shipped: batch.cars.filter((car) => car.state === "shipped").length,
    },
    flow2:
      batch.incident_enabled && batch.progress >= 35
        ? {
            cases: 1,
            open: batch.progress < 55 ? 1 : 0,
            resolved: batch.progress >= 55 ? 1 : 0,
            escalated: 0,
          }
        : { cases: 0, open: 0, resolved: 0, escalated: 0 },
    flow3: {
      pass: gateVerdicts.filter((value) => value === "PASS").length,
      review: gateVerdicts.filter((value) => value === "REVIEW").length,
      fail: gateVerdicts.filter((value) => value === "FAIL").length,
    },
    flow4: {
      pass:
        deadLamp && batch.progress >= 45
          ? Math.max(0, batch.cars.length - 1)
          : batch.progress >= 45
            ? batch.cars.length
            : 0,
      review: 0,
      fail: deadLamp && batch.progress >= 45 ? 1 : 0,
      disagreements: deadLamp && batch.progress >= 45 ? 1 : 0,
    },
    flow5: {
      pass: reportVerdicts.filter((value) => value === "PASS").length,
      rework: reportVerdicts.filter((value) => value === "FAIL").length,
      shipped: batch.cars.filter((car) => car.state === "shipped").length,
    },
    flow6:
      batch.incident_enabled && batch.progress >= 70
        ? {
            test_requests: 1,
            generated: batch.progress >= 75 ? 1 : 0,
            status: batch.progress >= 75 ? "generated" : "running",
          }
        : { test_requests: 0, generated: 0, status: "not_triggered" },
    flow7:
      batch.incident_enabled && batch.progress >= 70
        ? {
            runs: batch.progress >= 90 ? 4 : 0,
            failures: 0,
            status: batch.progress >= 90 ? "done" : "running",
          }
        : { runs: 0, failures: 0, status: "not_triggered" },
  };

  const targetEvents = Math.floor((batch.progress / 100) * 24);
  while (batch.event_cursor < targetEvents) {
    const index = batch.event_cursor++;
    const flow = (index % 7) + 1;
    const car = batch.cars[index % batch.cars.length];
    addEvent(
      req,
      batch,
      flow,
      `${car.vin} · mock checkpoint ${index + 1}`,
      `Deterministic mock event at ${batch.progress}% batch progress.`,
      index === 9 || index === 17 ? "warn" : "info",
    );
  }

  if (batch.progress >= 100) {
    batch.status = "done";
    batch.finished_at = new Date().toISOString();
    batch.progress = 100;
    batch.finished_cars = batch.requested_cars;
    (batch as MockBatch & { _event_count?: number })._event_count =
      req.db.batchEvents[batch.batch_id]?.length ?? 0;
    batch.report = { ...mockReport(batch) };
    batch.message = "batch report ready";
  }
}

export function materializeBatches(req: MockRequest) {
  for (const batch of req.db.batches) materialize(batch, req);
}

export function getBatches(req: MockRequest) {
  const status = strQuery(req.query.status);
  const items = req.db.batches
    .filter((batch) => !status || batch.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(summary);
  return paginate(items, req.query);
}

export function getBatch(req: MockRequest) {
  const batch = req.db.batches.find((item) => item.batch_id === req.params.batch_id);
  if (!batch) fail(404, `Batch ${req.params.batch_id} not found.`, "batch_not_found");
  return publicBatch(batch);
}

export function createBatch(req: MockRequest) {
  const cars = req.body.cars;
  if (typeof cars !== "number" || !Number.isInteger(cars) || cars < 1 || cars > 6) {
    fail(422, "Cars must be a whole number from 1 to 6.", "validation_error");
  }
  if (req.db.batches.some((batch) => batch.status === "queued" || batch.status === "running")) {
    fail(409, "Another batch is already active.", "batch_running");
  }
  req.db.batchSeq += 1;
  const batchId = `BAT-${String(req.db.batchSeq).padStart(4, "0")}`;
  const incident = cars >= 3;
  const wrongIndex = cars >= 2 ? 0 : -1;
  const deadIndex = cars >= 3 ? 1 : -1;
  const incidentIndex = incident ? cars - 1 : -1;
  const rows: BatchCar[] = Array.from({ length: cars }, (_, index) => {
    const kind =
      index === wrongIndex
        ? "wrong_colour"
        : index === deadIndex
          ? "dead_lamp"
          : index === incidentIndex
            ? "incident"
            : "clean";
    return {
      vin: `VIN-M${String(req.db.batchSeq).padStart(2, "0")}-${index + 1}`,
      truck_id: `T-${(index % Math.min(cars, 2)) + 1}`,
      expected: { kind, fault_step: kind === "dead_lamp" ? "headlights" : null },
      state: "line_end",
      stage: 1,
      location: "line_end",
      slot: null,
      gate_verdict: null,
      report_verdict: null,
      updated_at: new Date().toISOString(),
    };
  });
  const now = new Date().toISOString();
  const batch: MockBatch = {
    batch_id: batchId,
    status: "queued",
    engine: "mock",
    requested_cars: cars,
    created_cars: cars,
    finished_cars: 0,
    progress: 0,
    created_at: now,
    started_at: null,
    finished_at: null,
    message: "queued",
    seed: 7,
    incident_enabled: incident,
    incident_vin: incident ? (rows[incidentIndex]?.vin ?? null) : null,
    job_id: `JOB-MOCK-${req.db.batchSeq}`,
    flow_counts: {
      flow1: { released: 0, waiting: cars, in_yard: 0, shipped: 0 },
      flow2: { cases: 0, open: 0, resolved: 0, escalated: 0 },
      flow3: { pass: 0, review: 0, fail: 0 },
      flow4: { pass: 0, review: 0, fail: 0, disagreements: 0 },
      flow5: { pass: 0, rework: 0, shipped: 0 },
      flow6: { test_requests: 0, generated: 0, status: "not_triggered" },
      flow7: { runs: 0, failures: 0, status: "not_triggered" },
    },
    cars: rows,
    report: null,
    event_cursor: 0,
  };
  req.db.batches.unshift(batch);
  req.db.batchEvents[batchId] = [];
  return {
    batch_id: batchId,
    job_id: batch.job_id,
    status: "queued",
    requested_cars: cars,
    created_cars: cars,
  };
}

export function getBatchEvents(req: MockRequest) {
  const batch = req.db.batches.find((item) => item.batch_id === req.params.batch_id);
  if (!batch) fail(404, `Batch ${req.params.batch_id} not found.`, "batch_not_found");
  const since = req.query.since == null ? 0 : Number(req.query.since);
  const limit = req.query.limit == null ? 200 : Number(req.query.limit);
  if (
    !Number.isInteger(since) ||
    since < 0 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 1000
  ) {
    fail(422, "Invalid event cursor or limit.", "validation_error");
  }
  const flow = req.query.flow == null ? undefined : Number(req.query.flow);
  if (flow !== undefined && (!Number.isInteger(flow) || flow < 1 || flow > 7)) {
    fail(422, "Flow must be between 1 and 7.", "validation_error");
  }
  const all = (req.db.batchEvents[batch.batch_id] ?? []).filter(
    (event) => event.seq > since && (flow === undefined || event.flow === flow),
  );
  const items = all.slice(0, limit);
  return { items, next_since: items.at(-1)?.seq ?? since, has_more: all.length > limit };
}

export function getBatchReport(req: MockRequest) {
  const batch = req.db.batches.find((item) => item.batch_id === req.params.batch_id);
  if (!batch) fail(404, `Batch ${req.params.batch_id} not found.`, "batch_not_found");
  if (batch.status !== "done" || !batch.report) {
    fail(409, "Batch report is not ready.", "report_not_ready");
  }
  return batch.report;
}

export function cancelBatch(req: MockRequest) {
  const batch = req.db.batches.find((item) => item.batch_id === req.params.batch_id);
  if (!batch) fail(404, `Batch ${req.params.batch_id} not found.`, "batch_not_found");
  if (batch.status !== "queued" && batch.status !== "running") {
    fail(409, "Batch is already finished.", "batch_not_running");
  }
  batch.status = "cancelled";
  batch.finished_at = new Date().toISOString();
  batch.message = "cancelled by operator";
  addEvent(req, batch, 1, "Batch cancelled", batch.message, "warn");
  return { batch_id: batch.batch_id, status: batch.status };
}
