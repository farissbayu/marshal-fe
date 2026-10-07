import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Shared primitives
 * ------------------------------------------------------------------ */

export const roleSchema = z.enum(["supervisor", "inspector", "worker", "engineer"]);
export type Role = z.infer<typeof roleSchema>;

export const severitySchema = z.enum(["info", "good", "warn", "bad"]);
export type Severity = z.infer<typeof severitySchema>;

export const verdictSchema = z.enum(["PASS", "REVIEW", "FAIL"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const reviewStatusSchema = z.enum(["PENDING", "DONE", "ESCALATED"]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "done",
  "failed",
  "timeout",
  "unknown",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const carStateSchema = z.enum([
  "parked",
  "driving",
  "held",
  "waiting_dispatch",
  "inspecting",
  "rework",
  "ready",
  "exception",
]);
export type CarState = z.infer<typeof carStateSchema>;

/* ------------------------------------------------------------------ *
 * Health / identity / realtime
 * ------------------------------------------------------------------ */

export const healthSchema = z.object({
  status: z.enum(["ok", "degraded", "down"]),
  uptime_s: z.number().optional(),
});
export type Health = z.infer<typeof healthSchema>;

export const readinessSchema = z.object({
  status: z.enum(["ready", "not_ready"]),
  dependencies: z
    .array(z.object({ name: z.string(), status: z.enum(["ok", "failed"]) }))
    .default([]),
});
export type Readiness = z.infer<typeof readinessSchema>;

export const actorSchema = z.object({
  actor_id: z.string(),
  display_name: z.string(),
  role: roleSchema,
  plant: z.string().default("Plant 01"),
  permissions: z.array(z.string()).default([]),
});
export type Actor = z.infer<typeof actorSchema>;

export const flowEventSchema = z.object({
  seq: z.number(),
  at: z.string(),
  flow: z.number().int().min(1).max(7),
  source: z.string(),
  title: z.string(),
  detail: z.string(),
  level: severitySchema,
});
export type FlowEvent = z.infer<typeof flowEventSchema>;

/* ------------------------------------------------------------------ *
 * KPI / overview
 * ------------------------------------------------------------------ */

export const kpiSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  period: z.string().optional(),
  trend: z.enum(["up", "down", "flat"]).optional(),
  tone: z.enum(["default", "success", "warning", "danger", "info"]).optional(),
});
export type Kpi = z.infer<typeof kpiSchema>;

export const kpiResponseSchema = z.object({ items: z.array(kpiSchema) });
export type KpiResponse = z.infer<typeof kpiResponseSchema>;

/* ------------------------------------------------------------------ *
 * Yard / cars
 * ------------------------------------------------------------------ */

export const carSummarySchema = z.object({
  vin: z.string(),
  model: z.string().optional(),
  color: z.string().optional(),
  state: carStateSchema,
  location: z.string(),
  mission: z.string().nullable().optional(),
  truck_id: z.string().nullable().optional(),
  slot: z.string().nullable().optional(),
  flags: z.array(z.string()).default([]),
  updated_at: z.string(),
});
export type CarSummary = z.infer<typeof carSummarySchema>;

export const buildSheetSchema = z.object({
  model: z.string(),
  trim: z.string().optional(),
  color: z.string(),
  options: z.array(z.string()).default([]),
});
export type BuildSheet = z.infer<typeof buildSheetSchema>;

export const carDetailSchema = carSummarySchema.extend({
  build_sheet: buildSheetSchema,
  created_at: z.string(),
});
export type CarDetail = z.infer<typeof carDetailSchema>;

export const truckSchema = z.object({
  truck_id: z.string(),
  scheduled_eta: z.string().nullable().optional(),
  actual_eta: z.string().nullable().optional(),
  delay_minutes: z.number().optional(),
  destination: z.string().optional(),
  assigned_vins: z.array(z.string()).default([]),
});
export type Truck = z.infer<typeof truckSchema>;

export const zoneSchema = z.object({
  zone: z.string(),
  name: z.string().optional(),
  closed: z.boolean(),
  reason: z.string().nullable().optional(),
});
export type Zone = z.infer<typeof zoneSchema>;

export const reworkBaySchema = z.object({
  bay_id: z.string(),
  name: z.string().optional(),
  capacity: z.number(),
  occupied: z.number(),
  status: z.enum(["open", "near_full", "full"]).optional(),
  active_vins: z.array(z.string()).default([]),
});
export type ReworkBay = z.infer<typeof reworkBaySchema>;

export const yardSchema = z.object({
  plant: z.string(),
  updated_at: z.string(),
  summary: z.object({
    total: z.number(),
    exception: z.number(),
    held: z.number(),
    zones_closed: z.number(),
  }),
  cars: z.array(carSummarySchema),
  trucks: z.array(truckSchema),
  zones: z.array(zoneSchema),
  bays: z.array(reworkBaySchema),
});
export type Yard = z.infer<typeof yardSchema>;

export const mapPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["gate", "zone", "bay", "route", "point"]),
  x: z.number().optional(),
  y: z.number().optional(),
});
export type MapPoint = z.infer<typeof mapPointSchema>;

export const mapSchema = z.object({ points: z.array(mapPointSchema) });
export type YardMap = z.infer<typeof mapSchema>;

/* ------------------------------------------------------------------ *
 * Proposals
 * ------------------------------------------------------------------ */

export const proposalKindSchema = z.enum(["replan", "inspection_review", "rework"]);
export type ProposalKind = z.infer<typeof proposalKindSchema>;

export const proposalSchema = z.object({
  proposal_id: z.string(),
  kind: proposalKindSchema,
  vin: z.string().nullable().optional(),
  category: z.string(),
  summary: z.string(),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["pending", "approved", "rejected", "escalated"]),
  allowed_actions: z.array(z.string()).default([]),
  effects: z.object({ approve: z.string().optional(), reject: z.string().optional() }).optional(),
  created_at: z.string(),
  decided_at: z.string().nullable().optional(),
  decided_by: z.string().nullable().optional(),
  decision: z.string().nullable().optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;

/* ------------------------------------------------------------------ *
 * Assistance
 * ------------------------------------------------------------------ */

export const assistanceOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  reason: z.string().optional(),
  rank: z.number().optional(),
});
export type AssistanceOption = z.infer<typeof assistanceOptionSchema>;

export const assistanceCaseSchema = z.object({
  case_id: z.string(),
  vin: z.string(),
  location: z.string(),
  situation: z.string(),
  status: z.enum(["OPEN", "ESCALATED", "RESOLVED"]),
  opened_at: z.string(),
  escalation: z.string().nullable().optional(),
  moving_people_or_equipment: z.boolean().default(false),
  risk_note: z.string().nullable().optional(),
  recommendation: z
    .object({ option_id: z.string(), confidence: z.number(), note: z.string().optional() })
    .nullable()
    .optional(),
  options: z.array(assistanceOptionSchema).default([]),
  media_ids: z.array(z.string()).default([]),
  resolved_by: z.string().nullable().optional(),
  resolved_at: z.string().nullable().optional(),
  chosen_option: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
});
export type AssistanceCase = z.infer<typeof assistanceCaseSchema>;

export const assistanceKpiSchema = z.object({
  open: z.number(),
  resolved: z.number(),
  avg_latency_minutes: z.number(),
  period: z.string().optional(),
});
export type AssistanceKpis = z.infer<typeof assistanceKpiSchema>;

/* ------------------------------------------------------------------ *
 * Inspection / report / rework
 * ------------------------------------------------------------------ */

export const inspectionResultSchema = z.object({
  result_id: z.string(),
  vin: z.string(),
  kind: z.enum(["visual", "functional"]),
  verdict: verdictSchema,
  finding_count: z.number().default(0),
  failed_check_count: z.number().default(0),
  at: z.string(),
  review_status: reviewStatusSchema.default("PENDING"),
  proposal_id: z.string().nullable().optional(),
});
export type InspectionResult = z.infer<typeof inspectionResultSchema>;

export const visualFindingSchema = z.object({
  zone: z.string(),
  defect_type: z.string(),
  size: z.string().optional(),
  confidence: z.number(),
  observation: z.string(),
  media_id: z.string().nullable().optional(),
});
export type VisualFinding = z.infer<typeof visualFindingSchema>;

export const buildSheetMismatchSchema = z.object({
  attribute: z.string(),
  expected: z.string(),
  found: z.string(),
  confidence: z.number(),
});
export type BuildSheetMismatch = z.infer<typeof buildSheetMismatchSchema>;

export const visualInspectionSchema = z.object({
  result_id: z.string(),
  vin: z.string(),
  verdict: verdictSchema,
  at: z.string(),
  review_status: reviewStatusSchema,
  reviewed_by: z.string().nullable().optional(),
  review_decision: z.string().nullable().optional(),
  proposal_id: z.string().nullable().optional(),
  findings: z.array(visualFindingSchema).default([]),
  mismatches: z.array(buildSheetMismatchSchema).default([]),
});
export type VisualInspection = z.infer<typeof visualInspectionSchema>;

export const functionalStepSchema = z.object({
  step: z.number(),
  name: z.string(),
  telemetry: z.string().nullable().optional(),
  camera_result: z.string().nullable().optional(),
  confidence: z.number(),
  observation: z.string().optional(),
  disagree: z.boolean().default(false),
  media_id: z.string().nullable().optional(),
});
export type FunctionalStep = z.infer<typeof functionalStepSchema>;

export const functionalInspectionSchema = z.object({
  result_id: z.string(),
  vin: z.string(),
  verdict: verdictSchema,
  at: z.string(),
  review_status: reviewStatusSchema,
  reviewed_by: z.string().nullable().optional(),
  review_decision: z.string().nullable().optional(),
  proposal_id: z.string().nullable().optional(),
  steps: z.array(functionalStepSchema).default([]),
});
export type FunctionalInspection = z.infer<typeof functionalInspectionSchema>;

export const reworkTicketSchema = z.object({
  ticket_id: z.string(),
  vin: z.string(),
  kind: z.string(),
  bay: z.string(),
  status: z.enum(["OPEN", "IN_REPAIR", "DONE", "WAITING_REINSPECTION"]),
  created_at: z.string(),
  updated_at: z.string(),
  done_by: z.string().nullable().optional(),
});
export type ReworkTicket = z.infer<typeof reworkTicketSchema>;

export const reportSchema = z.object({
  vin: z.string(),
  verdict: verdictSchema,
  confirmed_by: z.string().nullable().optional(),
  confirmed_at: z.string().nullable().optional(),
  summary: z.string(),
  open_findings: z.number().default(0),
  visual_findings: z.array(visualFindingSchema).default([]),
  functional_failures: z.array(functionalStepSchema).default([]),
  rework_tickets: z.array(reworkTicketSchema).default([]),
  reinspection_status: z.enum(["WAITING", "PASS", "FAIL", "NOT_REQUIRED"]).default("NOT_REQUIRED"),
  updated_at: z.string(),
});
export type Report = z.infer<typeof reportSchema>;

/* ------------------------------------------------------------------ *
 * Test lab
 * ------------------------------------------------------------------ */

export const testRequestSchema = z.object({
  request_id: z.string(),
  source: z.string(),
  text: z.string(),
  created_at: z.string(),
  status: z.enum(["new", "processing", "converted", "failed"]),
  scenario_id: z.string().nullable().optional(),
});
export type TestRequest = z.infer<typeof testRequestSchema>;

export const scenarioStatusSchema = z.enum([
  "draft",
  "dry_run_running",
  "pending_review",
  "approved",
  "rejected",
  "runnable",
]);
export type ScenarioStatus = z.infer<typeof scenarioStatusSchema>;

export const scenarioSchema = z.object({
  scenario_id: z.string(),
  source: z.string(),
  status: scenarioStatusSchema,
  tags: z.array(z.string()).default([]),
  owner: z.string(),
  summary: z.string(),
  created_at: z.string(),
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const validatorNoteSchema = z.object({
  severity: z.enum(["ok", "warning", "error"]),
  message: z.string(),
});
export type ValidatorNote = z.infer<typeof validatorNoteSchema>;

export const scenarioDetailSchema = scenarioSchema.extend({
  spec: z.record(z.string(), z.unknown()).default({}),
  validator_notes: z.array(validatorNoteSchema).default([]),
  dry_run_metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  review: z
    .object({
      decision: z.string(),
      actor_id: z.string(),
      note: z.string().optional(),
      at: z.string(),
    })
    .nullable()
    .optional(),
  adversarial_result: z
    .object({
      runs: z.number(),
      verdict: z.enum(["ROBUST", "FRAGILE"]),
      smallest_failing_variant: z.string().nullable().optional(),
      criteria: z.record(z.string(), z.string()).optional(),
      metrics: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      report_id: z.string().nullable().optional(),
      media_ids: z.array(z.string()).default([]),
    })
    .nullable()
    .optional(),
});
export type ScenarioDetail = z.infer<typeof scenarioDetailSchema>;

export const releaseEvalTestSchema = z.object({
  test_id: z.string(),
  scenario_id: z.string().optional(),
  metric: z.string(),
  criteria: z.string(),
  result: z.string(),
  passed: z.boolean(),
  report_id: z.string().nullable().optional(),
  media_ids: z.array(z.string()).optional(),
});
export type ReleaseEvalTest = z.infer<typeof releaseEvalTestSchema>;

export const releaseSchema = z.object({
  release_id: z.string(),
  evaluation_status: z.enum(["none", "running", "done", "failed"]),
  gate: z.enum(["pending", "approved", "blocked"]),
  passed: z.number().default(0),
  failed: z.number().default(0),
  tests: z.array(releaseEvalTestSchema).default([]),
  approved_by: z.string().nullable().optional(),
  approved_at: z.string().nullable().optional(),
  updated_at: z.string(),
});
export type Release = z.infer<typeof releaseSchema>;

/* ------------------------------------------------------------------ *
 * Jobs & media
 * ------------------------------------------------------------------ */

export const jobSchema = z.object({
  job_id: z.string(),
  kind: z.string(),
  status: jobStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  result: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Job = z.infer<typeof jobSchema>;

export const mediaSchema = z.object({
  media_id: z.string(),
  kind: z.enum(["image", "clip"]),
  content_type: z.string(),
  url: z.string(),
  expires_at: z.string().nullable().optional(),
  available: z.boolean().default(true),
});
export type Media = z.infer<typeof mediaSchema>;

/* ------------------------------------------------------------------ *
 * List envelopes
 * ------------------------------------------------------------------ */

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  last_page: z.number(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ items: z.array(item), pagination: paginationSchema });
}

/* ------------------------------------------------------------------ *
 * Overview & inspection KPI
 * ------------------------------------------------------------------ */

export const overviewSchema = z.object({
  plant: z.string(),
  updated_at: z.string(),
  cars: z.object({
    total: z.number(),
    by_state: z.record(z.string(), z.number()),
    exception: z.number(),
    held: z.number(),
  }),
  assistance_open: z.number(),
  proposals_pending: z.number(),
  lab: z.object({
    scenarios_pending_review: z.number(),
    releases_blocked: z.number(),
  }),
  attention: z.object({
    assistance: z.array(assistanceCaseSchema),
    proposals: z.array(proposalSchema),
  }),
  yard_exceptions: z.array(carSummarySchema),
});
export type Overview = z.infer<typeof overviewSchema>;

export const inspectionKpiSchema = z.object({
  first_pass_yield: z.number(),
  review_share: z.number(),
  failure_count: z.number(),
  period: z.string().optional(),
});
export type InspectionKpis = z.infer<typeof inspectionKpiSchema>;
