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
      const isWorkerForklift =
        situation.toLowerCase().includes("worker") ||
        situation.toLowerCase().includes("forklift") ||
        situation.toLowerCase().includes("pekerja") ||
        source === "case-01" ||
        source === "case-02";

      const spec = isWorkerForklift
        ? {
            id: scenarioId,
            source: source === "manual" ? "supervisor request" : source,
            map_zone: "finishing_corner",
            time_of_day: "dusk",
            weather: "clear",
            ego: { route: "line_end->finishing", speed_kmh: 8 },
            actors: [
              { type: "forklift", state: "parked", position: "finishing_corner.p3" },
              {
                type: "worker",
                start: "behind:forklift",
                walk_speed_ms: 1.3,
                trigger: { ego_distance_m: 9 },
              },
            ],
            pass_criteria: [
              "no_contact",
              "min_gap_to_person_m >= 1.5",
              "speed_near_person_kmh <= 5",
            ],
          }
        : {
            scenario: "generated_scenario",
            map: "Town04",
            weather: "clear",
            actors: [{ type: "dynamic", source }],
            ego: { start: "GATE-IN", goal: "GATE-OUT", target_speed_kph: 20 },
            pass_criteria: ["min_distance_m >= 2.0", "max_collisions == 0"],
          };

      const detail: ScenarioDetail = {
        ...scenario,
        status: "runnable",
        spec,
        validator_notes: [
          {
            severity: "ok",
            message: "Titik peta 'finishing_corner.p3' valid terhadap plant map koordinat",
          },
          { severity: "ok", message: "Actor types dan kriteria lulus tervalidasi" },
          { severity: "ok", message: "Compiled ke kode ScenarioRunner CARLA 0.9.15" },
        ],
        dry_run_metrics: { distance_m: 42, steps: 16, collisions: 0, duration_s: 18 },
        review: null,
        adversarial_result: {
          runs: 24,
          verdict: "FRAGILE",
          smallest_failing_variant: "light=night, trigger=7m, occluder=pallet_stack",
          criteria: { min_distance_m: ">= 1.5m", max_collisions: "== 0" },
          metrics: { min_distance_observed_m: 0.6, collisions: 0 },
          report_id: `RPT-ADV-${scenarioId}`,
          media_ids: ["media-005"],
          variants: [
            {
              variant_id: "v01",
              light: "noon",
              trigger_distance_m: 11,
              occluder: "none",
              ego_speed_kmh: 8,
              min_gap_m: 3.2,
              passed: true,
            },
            {
              variant_id: "v02",
              light: "noon",
              trigger_distance_m: 9,
              occluder: "forklift",
              ego_speed_kmh: 8,
              min_gap_m: 2.7,
              passed: true,
            },
            {
              variant_id: "v03",
              light: "noon",
              trigger_distance_m: 7,
              occluder: "pallet_stack",
              ego_speed_kmh: 8,
              min_gap_m: 2.1,
              passed: true,
            },
            {
              variant_id: "v04",
              light: "noon",
              trigger_distance_m: 5,
              occluder: "pallet_stack",
              ego_speed_kmh: 8,
              min_gap_m: 1.6,
              passed: true,
            },
            {
              variant_id: "v05",
              light: "dusk",
              trigger_distance_m: 11,
              occluder: "none",
              ego_speed_kmh: 8,
              min_gap_m: 2.9,
              passed: true,
            },
            {
              variant_id: "v06",
              light: "dusk",
              trigger_distance_m: 9,
              occluder: "forklift",
              ego_speed_kmh: 8,
              min_gap_m: 2.4,
              passed: true,
            },
            {
              variant_id: "v07",
              light: "dusk",
              trigger_distance_m: 7,
              occluder: "pallet_stack",
              ego_speed_kmh: 8,
              min_gap_m: 1.8,
              passed: true,
            },
            {
              variant_id: "v08",
              light: "dusk",
              trigger_distance_m: 5,
              occluder: "pallet_stack",
              ego_speed_kmh: 8,
              min_gap_m: 1.5,
              passed: true,
            },
            {
              variant_id: "v09",
              light: "night",
              trigger_distance_m: 11,
              occluder: "none",
              ego_speed_kmh: 8,
              min_gap_m: 2.3,
              passed: true,
            },
            {
              variant_id: "v10",
              light: "night",
              trigger_distance_m: 9,
              occluder: "forklift",
              ego_speed_kmh: 8,
              min_gap_m: 1.7,
              passed: true,
            },
            {
              variant_id: "v17",
              light: "night",
              trigger_distance_m: 7,
              occluder: "pallet_stack",
              ego_speed_kmh: 10,
              min_gap_m: 0.6,
              passed: false,
              clip_id: "media-005",
            },
            {
              variant_id: "v12",
              light: "night",
              trigger_distance_m: 5,
              occluder: "pallet_stack",
              ego_speed_kmh: 10,
              min_gap_m: 0.4,
              passed: false,
              clip_id: "media-005",
            },
          ],
          failure_report: {
            variant_id: `${scenarioId}-v17`,
            summary: `${scenarioId}-v17 gagal: mobil berhenti pada jarak 0.6 m dari pekerja di malam hari di balik tumpukan palet (batas aman 1.5 m). Lolos pada varian dusk.`,
            conditions:
              "Malam hari (night), pemicu pekerja 7 m, occluder pallet_stack, kecepatan ego 10 km/h.",
            measured_gap_m: 0.6,
            limit_gap_m: 1.5,
            likely_cause:
              "Deteksi terlambat dalam kondisi cahaya rendah di balik penghalang tinggi (pallet stack).",
            suggested_fix:
              "Turunkan batas kecepatan ego di area finishing_corner saat malam hari menjadi 5 km/h.",
            clip_id: "media-005",
          },
        },
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
      const fragile = scenarioId.endsWith("1") || scenarioId.endsWith("5");
      detail.adversarial_result = {
        runs: 24,
        verdict: fragile ? "FRAGILE" : "ROBUST",
        smallest_failing_variant: fragile ? "light=night, trigger=7m, occluder=pallet_stack" : null,
        criteria: { min_distance_m: ">= 1.5m", max_collisions: "== 0" },
        metrics: fragile
          ? { min_distance_observed_m: 0.6, collisions: 0 }
          : { min_distance_observed_m: 2.6, collisions: 0 },
        report_id: `RPT-ADV-${scenarioId}`,
        media_ids: ["media-005"],
        variants: [
          {
            variant_id: "v01",
            light: "noon",
            trigger_distance_m: 11,
            occluder: "none",
            ego_speed_kmh: 8,
            min_gap_m: 3.2,
            passed: true,
          },
          {
            variant_id: "v02",
            light: "noon",
            trigger_distance_m: 9,
            occluder: "forklift",
            ego_speed_kmh: 8,
            min_gap_m: 2.7,
            passed: true,
          },
          {
            variant_id: "v03",
            light: "noon",
            trigger_distance_m: 7,
            occluder: "pallet_stack",
            ego_speed_kmh: 8,
            min_gap_m: 2.1,
            passed: true,
          },
          {
            variant_id: "v04",
            light: "noon",
            trigger_distance_m: 5,
            occluder: "pallet_stack",
            ego_speed_kmh: 8,
            min_gap_m: 1.6,
            passed: true,
          },
          {
            variant_id: "v05",
            light: "dusk",
            trigger_distance_m: 11,
            occluder: "none",
            ego_speed_kmh: 8,
            min_gap_m: 2.9,
            passed: true,
          },
          {
            variant_id: "v06",
            light: "dusk",
            trigger_distance_m: 9,
            occluder: "forklift",
            ego_speed_kmh: 8,
            min_gap_m: 2.4,
            passed: true,
          },
          {
            variant_id: "v07",
            light: "dusk",
            trigger_distance_m: 7,
            occluder: "pallet_stack",
            ego_speed_kmh: 8,
            min_gap_m: 1.8,
            passed: true,
          },
          {
            variant_id: "v08",
            light: "dusk",
            trigger_distance_m: 5,
            occluder: "pallet_stack",
            ego_speed_kmh: 8,
            min_gap_m: 1.5,
            passed: true,
          },
          {
            variant_id: "v09",
            light: "night",
            trigger_distance_m: 11,
            occluder: "none",
            ego_speed_kmh: 8,
            min_gap_m: 2.3,
            passed: true,
          },
          {
            variant_id: "v10",
            light: "night",
            trigger_distance_m: 9,
            occluder: "forklift",
            ego_speed_kmh: 8,
            min_gap_m: 1.7,
            passed: true,
          },
          {
            variant_id: "v17",
            light: "night",
            trigger_distance_m: 7,
            occluder: "pallet_stack",
            ego_speed_kmh: 10,
            min_gap_m: fragile ? 0.6 : 1.9,
            passed: !fragile,
            clip_id: "media-005",
          },
          {
            variant_id: "v12",
            light: "night",
            trigger_distance_m: 5,
            occluder: "pallet_stack",
            ego_speed_kmh: 10,
            min_gap_m: fragile ? 0.4 : 1.6,
            passed: !fragile,
            clip_id: "media-005",
          },
        ],
        failure_report: fragile
          ? {
              variant_id: `${scenarioId}-v17`,
              summary: `${scenarioId}-v17 gagal: mobil berhenti pada jarak 0.6 m dari pekerja di malam hari di balik tumpukan palet (batas 1.5 m).`,
              conditions:
                "Malam hari (night), pemicu pekerja 7 m, occluder pallet_stack, kecepatan ego 10 km/h.",
              measured_gap_m: 0.6,
              limit_gap_m: 1.5,
              likely_cause:
                "Deteksi terlambat dalam kondisi cahaya rendah di balik penghalang tinggi (pallet stack).",
              suggested_fix:
                "Turunkan kecepatan ego di area finishing_corner saat malam hari menjadi 5 km/h.",
              clip_id: "media-005",
            }
          : null,
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
