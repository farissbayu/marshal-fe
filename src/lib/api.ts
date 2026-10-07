import { z } from "zod";
import { api } from "./api-client";
import {
  actorSchema,
  assistanceCaseSchema,
  assistanceKpiSchema,
  buildSheetMismatchSchema,
  carDetailSchema,
  carSummarySchema,
  functionalInspectionSchema,
  healthSchema,
  inspectionKpiSchema,
  inspectionResultSchema,
  jobSchema,
  kpiResponseSchema,
  mapSchema,
  mediaSchema,
  overviewSchema,
  pageSchema,
  proposalSchema,
  readinessSchema,
  releaseSchema,
  reportSchema,
  reworkBaySchema,
  scenarioDetailSchema,
  scenarioSchema,
  testRequestSchema,
  truckSchema,
  visualInspectionSchema,
  yardSchema,
} from "./schemas";

const carsPage = pageSchema(carSummarySchema);
const proposalsPage = pageSchema(proposalSchema);
const assistancePage = pageSchema(assistanceCaseSchema);
const inspectionPage = pageSchema(inspectionResultSchema);
const reportsPage = pageSchema(reportSchema);
const requestsPage = pageSchema(testRequestSchema);
const scenariosPage = pageSchema(scenarioSchema);
const releasesPage = pageSchema(releaseSchema);

export interface ListParams {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/* ---------------------------- health / identity --------------------------- */

export const fetchHealth = () => api.get("/healthz", { schema: healthSchema });
export const fetchReadiness = () => api.get("/readyz", { schema: readinessSchema });
export const fetchMe = () => api.get("/me", { schema: actorSchema });
export const fetchOverview = () => api.get("/overview", { schema: overviewSchema });
export const fetchKpis = () => api.get("/kpis", { schema: kpiResponseSchema });

/* --------------------------------- yard ---------------------------------- */

export const fetchYard = () => api.get("/yard", { schema: yardSchema });
export const fetchCars = (params: ListParams = {}) =>
  api.get("/cars", { query: params, schema: carsPage });
export const fetchCar = (vin: string) =>
  api.get(`/cars/${encodeURIComponent(vin)}`, { schema: carDetailSchema });
export const fetchMap = () => api.get("/map", { schema: mapSchema });

export const updateTruckEta = (truckId: string, body: { eta: string; reason?: string }) =>
  api.post(`/trucks/${encodeURIComponent(truckId)}/eta`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

export const loadTruck = (truckId: string) =>
  api.post(
    `/trucks/${encodeURIComponent(truckId)}/load`,
    {},
    { schema: z.record(z.string(), z.unknown()) },
  );

export const setZoneClosure = (zone: string, body: { closed: boolean; reason?: string }) =>
  api.post(`/zones/${encodeURIComponent(zone)}/closure`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

export const sendMission = (vin: string, body: { destination: string; reason?: string }) =>
  api.post(`/cars/${encodeURIComponent(vin)}/missions`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

export const holdCar = (vin: string, body: { reason: string; duration_minutes?: number }) =>
  api.post(`/cars/${encodeURIComponent(vin)}/hold`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

export const resumeCar = (vin: string) =>
  api.post(
    `/cars/${encodeURIComponent(vin)}/resume`,
    {},
    { schema: z.record(z.string(), z.unknown()) },
  );

/* ------------------------------- proposals ------------------------------- */

export const fetchProposals = (params: ListParams = {}) =>
  api.get("/proposals", { query: params, schema: proposalsPage });

export const decideProposal = (
  proposalId: string,
  body: { decision: string; actor_id: string; note?: string },
) =>
  api.post(`/proposals/${encodeURIComponent(proposalId)}/decide`, body, {
    schema: z.record(z.string(), z.unknown()),
    idempotencyKey: `decide-${proposalId}`,
  });

/* ------------------------------ assistance -------------------------------- */

export const fetchAssistanceCases = (params: ListParams = {}) =>
  api.get("/assistance/cases", { query: params, schema: assistancePage });

export const fetchAssistanceCase = (caseId: string) =>
  api.get(`/assistance/cases/${encodeURIComponent(caseId)}`, { schema: assistanceCaseSchema });

export const fetchAssistanceKpis = () =>
  api.get("/assistance/kpis", { schema: assistanceKpiSchema });

export const decideAssistance = (caseId: string, body: { option: string; actor_id: string }) =>
  api.post(`/assistance/cases/${encodeURIComponent(caseId)}/decide`, body, {
    schema: z.record(z.string(), z.unknown()),
    idempotencyKey: `assist-${caseId}`,
  });

/* --------------------------- inspection / report -------------------------- */

export const fetchInspectionResults = (params: ListParams = {}) =>
  api.get("/inspection/results", { query: params, schema: inspectionPage });

export const fetchInspectionKpis = () =>
  api.get("/inspection/kpis", { schema: inspectionKpiSchema });

export const fetchVisualInspection = (vin: string) =>
  api.get(`/cars/${encodeURIComponent(vin)}/inspection/visual`, { schema: visualInspectionSchema });

export const fetchFunctionalInspection = (vin: string) =>
  api.get(`/cars/${encodeURIComponent(vin)}/inspection/functional`, {
    schema: functionalInspectionSchema,
  });

export const fetchReports = (params: ListParams = {}) =>
  api.get("/reports", { query: params, schema: reportsPage });

export const fetchCarReport = (vin: string) =>
  api.get(`/cars/${encodeURIComponent(vin)}/report`, { schema: reportSchema });

export const fetchReworkBays = () =>
  api.get("/rework/bays", { schema: z.object({ items: z.array(reworkBaySchema) }) });

export const markReworkDone = (vin: string, body: { actor_id: string }) =>
  api.post(`/cars/${encodeURIComponent(vin)}/rework/done`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

/* -------------------------------- test lab -------------------------------- */

export const fetchTestRequests = (params: ListParams = {}) =>
  api.get("/lab/test-requests", { query: params, schema: requestsPage });

export const fetchScenarios = (params: ListParams = {}) =>
  api.get("/lab/scenarios", { query: params, schema: scenariosPage });

export const fetchScenario = (scenarioId: string) =>
  api.get(`/lab/scenarios/${encodeURIComponent(scenarioId)}`, { schema: scenarioDetailSchema });

export const createScenario = (body: { situation: string; source: string; request_id?: string }) =>
  api.post("/lab/scenarios", body, {
    schema: z.object({ job_id: z.string(), status: z.string() }),
  });

export const reviewScenario = (
  scenarioId: string,
  body: { decision: "approved" | "rejected"; actor_id: string; note?: string },
) =>
  api.post(`/lab/scenarios/${encodeURIComponent(scenarioId)}/review`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

export const startAdversarialSearch = (scenarioId: string) =>
  api.post(
    `/lab/scenarios/${encodeURIComponent(scenarioId)}/adversarial-search`,
    {},
    {
      schema: z.object({ job_id: z.string(), status: z.string() }),
    },
  );

export const fetchReleases = (params: ListParams = {}) =>
  api.get("/lab/releases", { query: params, schema: releasesPage });

export const fetchRelease = (releaseId: string) =>
  api.get(`/lab/releases/${encodeURIComponent(releaseId)}`, { schema: releaseSchema });

export const evaluateRelease = (releaseId: string) =>
  api.post(
    `/lab/releases/${encodeURIComponent(releaseId)}/evaluate`,
    {},
    {
      schema: z.object({ job_id: z.string(), status: z.string() }),
    },
  );

export const approveRelease = (releaseId: string, body: { actor_id: string }) =>
  api.post(`/lab/releases/${encodeURIComponent(releaseId)}/approve`, body, {
    schema: z.record(z.string(), z.unknown()),
  });

/* ------------------------------ jobs & media ------------------------------ */

export const fetchJob = (jobId: string) =>
  api.get(`/jobs/${encodeURIComponent(jobId)}`, { schema: jobSchema });

export const fetchMedia = (mediaId: string) =>
  api.get(`/media/${encodeURIComponent(mediaId)}`, { schema: mediaSchema });

/* ------------------------------- dev actor -------------------------------- */

export const switchMockActor = (role: string) =>
  api.post("/dev/actor", { role }, { schema: actorSchema });

export { buildSheetMismatchSchema, truckSchema };
