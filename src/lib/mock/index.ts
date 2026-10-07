import type { HttpMethod } from "@/lib/api-client";
import { db } from "./db";
import {
  decideAssistance,
  getAssistanceCase,
  getAssistanceCases,
  getAssistanceKpis,
} from "./handlers/assistance";
import {
  getHealth,
  getInspectionKpis,
  getKpis,
  getMe,
  getOverview,
  getReadiness,
} from "./handlers/health";
import {
  applyDebugError,
  delayForMethod,
  fail,
  type MockHandler,
  type MockRequest,
  sleep,
} from "./handlers/helpers";
import {
  getCarReport,
  getFunctionalInspection,
  getInspectionResults,
  getReports,
  getVisualInspection,
  markReworkDone,
} from "./handlers/inspection";
import {
  adversarialSearch,
  approveRelease,
  createScenario,
  evaluateRelease,
  getJob,
  getRelease,
  getReleases,
  getScenario,
  getScenarios,
  getTestRequests,
  reviewScenario,
} from "./handlers/lab";
import { getMedia } from "./handlers/media";
import { decideProposal, getProposal, getProposals } from "./handlers/proposals";
import {
  getCar,
  getCars,
  getMap,
  getReworkBays,
  getYard,
  holdCar,
  loadTruck,
  resumeCar,
  sendMission,
  setZoneClosure,
  updateTruckEta,
} from "./handlers/yard";
import { materializeJob } from "./jobs";

interface Route {
  method: HttpMethod;
  pattern: string;
  handler: MockHandler;
}

const routes: Route[] = [
  { method: "GET", pattern: "/healthz", handler: getHealth },
  { method: "GET", pattern: "/readyz", handler: getReadiness },
  { method: "GET", pattern: "/me", handler: getMe },
  { method: "GET", pattern: "/overview", handler: getOverview },
  { method: "GET", pattern: "/kpis", handler: getKpis },

  { method: "GET", pattern: "/yard", handler: getYard },
  { method: "GET", pattern: "/cars", handler: getCars },
  { method: "GET", pattern: "/map", handler: getMap },
  { method: "GET", pattern: "/rework/bays", handler: getReworkBays },
  { method: "GET", pattern: "/cars/:vin/inspection/visual", handler: getVisualInspection },
  { method: "GET", pattern: "/cars/:vin/inspection/functional", handler: getFunctionalInspection },
  { method: "GET", pattern: "/cars/:vin/report", handler: getCarReport },
  { method: "GET", pattern: "/cars/:vin", handler: getCar },

  { method: "GET", pattern: "/proposals", handler: getProposals },
  { method: "GET", pattern: "/proposals/:proposal_id", handler: getProposal },

  { method: "GET", pattern: "/assistance/cases", handler: getAssistanceCases },
  { method: "GET", pattern: "/assistance/kpis", handler: getAssistanceKpis },
  { method: "GET", pattern: "/assistance/cases/:case_id", handler: getAssistanceCase },

  { method: "GET", pattern: "/inspection/results", handler: getInspectionResults },
  { method: "GET", pattern: "/inspection/kpis", handler: getInspectionKpis },
  { method: "GET", pattern: "/reports", handler: getReports },

  { method: "GET", pattern: "/lab/test-requests", handler: getTestRequests },
  { method: "GET", pattern: "/lab/scenarios", handler: getScenarios },
  { method: "GET", pattern: "/lab/scenarios/:scenario_id", handler: getScenario },
  { method: "GET", pattern: "/lab/releases", handler: getReleases },
  { method: "GET", pattern: "/lab/releases/:release_id", handler: getRelease },

  { method: "GET", pattern: "/jobs/:job_id", handler: getJob },
  { method: "GET", pattern: "/media/:media_id", handler: getMedia },

  { method: "POST", pattern: "/dev/actor", handler: switchActor },
  { method: "POST", pattern: "/trucks/:truck_id/eta", handler: updateTruckEta },
  { method: "POST", pattern: "/trucks/:truck_id/load", handler: loadTruck },
  { method: "POST", pattern: "/zones/:zone/closure", handler: setZoneClosure },
  { method: "POST", pattern: "/cars/:vin/missions", handler: sendMission },
  { method: "POST", pattern: "/cars/:vin/hold", handler: holdCar },
  { method: "POST", pattern: "/cars/:vin/resume", handler: resumeCar },
  { method: "POST", pattern: "/proposals/:proposal_id/decide", handler: decideProposal },
  { method: "POST", pattern: "/assistance/cases/:case_id/decide", handler: decideAssistance },
  { method: "POST", pattern: "/cars/:vin/rework/done", handler: markReworkDone },
  { method: "POST", pattern: "/lab/scenarios", handler: createScenario },
  { method: "POST", pattern: "/lab/scenarios/:scenario_id/review", handler: reviewScenario },
  {
    method: "POST",
    pattern: "/lab/scenarios/:scenario_id/adversarial-search",
    handler: adversarialSearch,
  },
  { method: "POST", pattern: "/lab/releases/:release_id/evaluate", handler: evaluateRelease },
  { method: "POST", pattern: "/lab/releases/:release_id/approve", handler: approveRelease },
];

function switchActor(req: MockRequest) {
  const role = String(req.body.role ?? "");
  const actor = db.actors.find((a) => a.role === role);
  if (!actor) fail(422, `Role '${role}' tidak dikenal.`, "invalid_role");
  db.actorId = actor.actor_id;
  return actor;
}

function matchRoute(
  method: HttpMethod,
  path: string,
): { handler: MockHandler; params: Record<string, string> } | null {
  const cleanPath = path.split("?")[0]!.replace(/\/$/, "") || "/";
  const segments = cleanPath.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const patternSegments = route.pattern.split("/").filter(Boolean);
    if (patternSegments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i += 1) {
      const pattern = patternSegments[i]!;
      const value = segments[i]!;
      if (pattern.startsWith(":")) params[pattern.slice(1)] = decodeURIComponent(value);
      else if (pattern !== value) {
        matched = false;
        break;
      }
    }
    if (matched) return { handler: route.handler, params };
  }
  return null;
}

export async function mockRequest(
  method: HttpMethod,
  path: string,
  query: Record<string, unknown> = {},
  body: unknown = undefined,
  signal?: AbortSignal,
): Promise<unknown> {
  await sleep(delayForMethod(method), signal);

  applyDebugError(query.__error);
  if (body && typeof body === "object") applyDebugError((body as Record<string, unknown>).__error);

  const match = matchRoute(method, path);
  if (!match) {
    fail(404, `Mock route tidak ditemukan: ${method} ${path}`, "route_not_found");
  }

  const req: MockRequest = {
    method,
    path,
    query,
    body: (body && typeof body === "object" ? body : {}) as Record<string, unknown>,
    params: match.params,
    db,
  };

  const result = await match.handler(req);

  for (const job of db.jobs) materializeJob(db, job);
  return result;
}

export { resetDb } from "./db";
