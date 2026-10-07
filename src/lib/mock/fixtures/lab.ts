import type { Release, Scenario, ScenarioDetail, TestRequest } from "@/lib/schemas";
import { iso } from "./common";

export function testRequestsFixture(now: number): TestRequest[] {
  return [
    {
      request_id: "TRQ-001",
      source: "case-01",
      text: "Uji skenario obstacle tidak teridentifikasi dengan pejalan kaki di sisi kanan.",
      created_at: iso(20, now),
      status: "processing",
      scenario_id: null,
    },
    {
      request_id: "TRQ-002",
      source: "manual",
      text: "Tambah variasi hujan lebat pada uji pengereman darurat.",
      created_at: iso(55, now),
      status: "new",
      scenario_id: null,
    },
    {
      request_id: "TRQ-003",
      source: "case-02",
      text: "Skenario forklift melintas di jalur keluar gudang.",
      created_at: iso(140, now),
      status: "converted",
      scenario_id: "S001",
    },
  ];
}

export function scenariosFixture(now: number): Scenario[] {
  return [
    {
      scenario_id: "S001",
      source: "case-02",
      status: "pending_review",
      tags: ["edge", "obstacle", "human"],
      owner: "user-engineer-01",
      summary: "Forklift melintas saat kendaraan keluar gudang.",
      created_at: iso(130, now),
    },
    {
      scenario_id: "S002",
      source: "case-01",
      status: "approved",
      tags: ["regression", "obstacle"],
      owner: "user-engineer-01",
      summary: "Obstacle statis di depan kendaraan pada jalur sempit.",
      created_at: iso(300, now),
    },
    {
      scenario_id: "S003",
      source: "manual",
      status: "rejected",
      tags: ["night", "rain"],
      owner: "user-engineer-01",
      summary: "Pengereman darurat malam hari saat hujan lebat.",
      created_at: iso(400, now),
    },
    {
      scenario_id: "S004",
      source: "manual",
      status: "dry_run_running",
      tags: ["parking"],
      owner: "user-engineer-01",
      summary: "Parkir paralel di area sempit dengan kendaraan dinamis.",
      created_at: iso(15, now),
    },
    {
      scenario_id: "S005",
      source: "case-01",
      status: "runnable",
      tags: ["edge", "dynamic"],
      owner: "user-engineer-01",
      summary: "Bypass kendaraan dinamis saat jalur utama terblokir.",
      created_at: iso(500, now),
    },
  ];
}

export function scenarioDetailsFixture(now: number): Record<string, ScenarioDetail> {
  return {
    S001: {
      ...scenariosFixture(now)[0],
      spec: {
        scenario: "forklift_crossing",
        map: "Town04",
        weather: "clear",
        actors: [{ type: "forklift", speed_kph: 8, crossing: true }],
        ego: { start: "GATE-IN", goal: "GATE-OUT", target_speed_kph: 20 },
        success_criteria: { min_distance_m: 2.5, max_collisions: 0 },
      },
      validator_notes: [
        { severity: "ok", message: "Schema valid" },
        { severity: "warning", message: "Waypoint jarak terlalu pendek (2.0m < 2.5m)" },
      ],
      dry_run_metrics: { distance_m: 42, steps: 15, collisions: 0, duration_s: 18 },
      review: null,
      adversarial_result: null,
    },
    S002: {
      ...scenariosFixture(now)[1],
      spec: {
        scenario: "static_obstacle",
        map: "Town04",
        weather: "clear",
        actors: [{ type: "static_obstacle", offset_m: 6 }],
        ego: { start: "ZONE-A", goal: "TRACK-1", target_speed_kph: 15 },
        success_criteria: { min_distance_m: 1.0, max_collisions: 0 },
      },
      validator_notes: [{ severity: "ok", message: "Schema valid" }],
      dry_run_metrics: { distance_m: 30, steps: 12, collisions: 0, duration_s: 14 },
      review: {
        decision: "approved",
        actor_id: "user-engineer-01",
        note: "Siap dijalankan",
        at: iso(280, now),
      },
      adversarial_result: null,
    },
    S003: {
      ...scenariosFixture(now)[2],
      spec: {
        scenario: "emergency_brake_rain",
        map: "Town10HD",
        weather: "heavy_rain",
        actors: [],
        ego: { start: "TRACK-2", goal: "TRACK-2", target_speed_kph: 60 },
        success_criteria: { max_brake_distance_m: 20 },
      },
      validator_notes: [
        { severity: "ok", message: "Schema valid" },
        { severity: "error", message: "Parameter 'night' bertentangan dengan 'heavy_rain' preset" },
      ],
      review: {
        decision: "rejected",
        actor_id: "user-engineer-01",
        note: "Preset cuaca konflik",
        at: iso(380, now),
      },
      adversarial_result: null,
    },
    S005: {
      ...scenariosFixture(now)[4],
      spec: {
        scenario: "dynamic_bypass",
        map: "Town04",
        weather: "clear",
        actors: [{ type: "vehicle", motion: "dynamic", lane: "left" }],
        ego: { start: "ZONE-C", goal: "GATE-OUT", target_speed_kph: 18 },
        success_criteria: { min_distance_m: 2.0, max_collisions: 0 },
      },
      validator_notes: [{ severity: "ok", message: "Schema valid" }],
      dry_run_metrics: { distance_m: 55, steps: 20, collisions: 0, duration_s: 24 },
      review: {
        decision: "approved",
        actor_id: "user-engineer-01",
        note: "Lulus dry-run",
        at: iso(480, now),
      },
      adversarial_result: {
        runs: 24,
        verdict: "ROBUST",
        smallest_failing_variant: null,
        criteria: { min_distance_m: ">= 2.0m", max_collisions: "== 0" },
        metrics: { min_distance_observed_m: 2.4, collisions: 0 },
        report_id: "RPT-ADV-005",
        media_ids: ["media-005"],
      },
    },
  };
}

export function releasesFixture(now: number): Release[] {
  return [
    {
      release_id: "R1.0",
      evaluation_status: "done",
      gate: "approved",
      passed: 5,
      failed: 0,
      tests: [
        {
          test_id: "T001",
          scenario_id: "S002",
          metric: "0 collisions",
          criteria: "== 0",
          result: "0",
          passed: true,
        },
        {
          test_id: "T002",
          scenario_id: "S005",
          metric: "2.4 m",
          criteria: ">= 2.0 m",
          result: "2.4 m",
          passed: true,
        },
      ],
      approved_by: "user-engineer-01",
      approved_at: iso(1440, now),
      updated_at: iso(1440, now),
    },
    {
      release_id: "R1.1",
      evaluation_status: "done",
      gate: "blocked",
      passed: 3,
      failed: 2,
      tests: [
        {
          test_id: "T001",
          scenario_id: "S002",
          metric: "12.3 m",
          criteria: "< 15 m",
          result: "12.3 m",
          passed: true,
          report_id: "RPT-R11-001",
        },
        {
          test_id: "T002",
          scenario_id: "S005",
          metric: "22.1 m",
          criteria: "< 15 m",
          result: "22.1 m",
          passed: false,
          report_id: "RPT-R11-002",
        },
        {
          test_id: "T003",
          scenario_id: "S001",
          metric: "0 collisions",
          criteria: "== 0",
          result: "0",
          passed: true,
        },
        {
          test_id: "T004",
          scenario_id: "S002",
          metric: "3.1 m",
          criteria: ">= 2.0 m",
          result: "3.1 m",
          passed: true,
        },
        {
          test_id: "T005",
          scenario_id: "S005",
          metric: "1.1 m",
          criteria: ">= 2.0 m",
          result: "1.1 m",
          passed: false,
          report_id: "RPT-R11-005",
        },
      ],
      approved_by: null,
      approved_at: null,
      updated_at: iso(120, now),
    },
    {
      release_id: "R1.2",
      evaluation_status: "none",
      gate: "pending",
      passed: 0,
      failed: 0,
      tests: [],
      approved_by: null,
      approved_at: null,
      updated_at: iso(10, now),
    },
  ];
}
