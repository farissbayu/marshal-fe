import type { Job, Scenario, ScenarioDetail } from "@/lib/schemas";
import type { MockDb } from "./db";
import { iso } from "./fixtures/common";

interface JobRule {
  durationMs: number;
  progressMessage: string;
  onComplete: (db: MockDb, job: Job, payload: Record<string, unknown>) => void;
}

function nextId(db: MockDb): string {
  db.jobSeq += 1;
  return `JOB-${String(db.jobSeq).padStart(4, "0")}`;
}

export const JOB_RULES: Record<string, JobRule> = {
  scenario_generation: {
    durationMs: 6000,
    progressMessage: "Menghasilkan skenario & menjalankan dry-run",
    onComplete: (database, _job, payload) => {
      database.scenarioSeq += 1;
      const scenarioId = `S${String(database.scenarioSeq).padStart(3, "0")}`;
      const now = Date.now();
      const source = String(payload.source ?? "manual");
      const situation = String(payload.situation ?? "Skenario baru dari test lab.");
      const scenario: Scenario = {
        scenario_id: scenarioId,
        source,
        status: "pending_review",
        tags: ["generated", "edge"],
        owner: database.actorId,
        summary: situation.slice(0, 120),
        created_at: new Date(now).toISOString(),
      };
      database.scenarios.unshift(scenario);
      const detail: ScenarioDetail = {
        ...scenario,
        spec: {
          scenario: "generated_scenario",
          map: "Town04",
          weather: "clear",
          actors: [{ type: "dynamic", source }],
          ego: { start: "GATE-IN", goal: "GATE-OUT", target_speed_kph: 20 },
          success_criteria: { min_distance_m: 2.0, max_collisions: 0 },
        },
        validator_notes: [
          { severity: "ok", message: "Schema valid" },
          { severity: "warning", message: "Dry-run belum dijalankan penuh" },
        ],
        dry_run_metrics: { distance_m: 38, steps: 14, collisions: 0, duration_s: 16 },
        review: null,
        adversarial_result: null,
      };
      database.scenarioDetails[scenarioId] = detail;
      const requestId = payload.request_id
        ? String(payload.request_id)
        : database.testRequests.find((r) => r.status === "processing")?.request_id;
      if (requestId) {
        const req = database.testRequests.find((r) => r.request_id === requestId);
        if (req) {
          req.status = "converted";
          req.scenario_id = scenarioId;
        }
      }
    },
  },
  adversarial_search: {
    durationMs: 7000,
    progressMessage: "Menjalankan pencarian adversarial",
    onComplete: (database, _job, payload) => {
      const scenarioId = String(payload.scenario_id ?? "");
      const detail = database.scenarioDetails[scenarioId];
      if (!detail) return;
      const fragile = scenarioId.endsWith("1");
      detail.adversarial_result = {
        runs: 24,
        verdict: fragile ? "FRAGILE" : "ROBUST",
        smallest_failing_variant: fragile ? "rain_intensity=0.8 & speed=45kph" : null,
        criteria: { min_distance_m: ">= 2.0m", max_collisions: "== 0" },
        metrics: fragile
          ? { min_distance_observed_m: 1.4, collisions: 1 }
          : { min_distance_observed_m: 2.6, collisions: 0 },
        report_id: `RPT-ADV-${scenarioId}`,
        media_ids: ["media-005"],
      };
      const scenario = database.scenarios.find((s) => s.scenario_id === scenarioId);
      if (scenario) scenario.status = "runnable";
    },
  },
  release_evaluate: {
    durationMs: 8000,
    progressMessage: "Menjalankan regression suite",
    onComplete: (database, _job, payload) => {
      const releaseId = String(payload.release_id ?? "");
      const release = database.releases.find((r) => r.release_id === releaseId);
      if (!release) return;
      const now = Date.now();
      if (releaseId === "R1.2") {
        release.tests = [
          {
            test_id: "T001",
            scenario_id: "S002",
            metric: "11.2 m",
            criteria: "< 15 m",
            result: "11.2 m",
            passed: true,
          },
          {
            test_id: "T002",
            scenario_id: "S005",
            metric: "2.6 m",
            criteria: ">= 2.0 m",
            result: "2.6 m",
            passed: true,
          },
          {
            test_id: "T003",
            scenario_id: "S001",
            metric: "0 collisions",
            criteria: "== 0",
            result: "0",
            passed: true,
          },
        ];
        release.passed = 3;
        release.failed = 0;
        release.gate = "approved";
      } else {
        release.gate = release.failed === 0 ? "approved" : "blocked";
      }
      release.evaluation_status = "done";
      release.updated_at = iso(0, now);
    },
  },
};

export function startJob(database: MockDb, kind: string, payload: Record<string, unknown>): Job {
  const now = Date.now();
  const job: Job = {
    job_id: nextId(database),
    kind,
    status: "queued",
    progress: 0,
    message: JOB_RULES[kind]?.progressMessage ?? "Menunggu diproses",
    result: null,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  database.jobs.unshift(job);
  database.jobPayloads[job.job_id] = payload;
  return job;
}

export function materializeJob(database: MockDb, job: Job): Job {
  if (job.status === "done" || job.status === "failed" || job.status === "timeout") return job;
  const rule = JOB_RULES[job.kind];
  if (!rule) {
    job.status = "unknown";
    job.message = "Status pekerjaan tidak diketahui";
    return job;
  }
  const elapsed = Date.now() - new Date(job.created_at).getTime();
  const now = Date.now();
  if (elapsed >= rule.durationMs) {
    job.status = "done";
    job.progress = 100;
    job.message = "Selesai";
    job.updated_at = new Date(now).toISOString();
    rule.onComplete(database, job, database.jobPayloads[job.job_id] ?? {});
    job.result = { kind: job.kind, completed_at: job.updated_at };
  } else {
    job.status = "running";
    job.progress = Math.max(1, Math.min(99, Math.floor((elapsed / rule.durationMs) * 100)));
    job.message = rule.progressMessage;
    job.updated_at = new Date(now).toISOString();
  }
  return job;
}
