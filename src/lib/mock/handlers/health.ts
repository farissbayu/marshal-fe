import type { CarState, Kpi, Overview } from "@/lib/schemas";
import { currentActor } from "../db";
import type { MockRequest } from "./helpers";

export function getHealth() {
  return { status: "ok" as const, uptime_s: 42_318 };
}

export function getReadiness() {
  return {
    status: "ready" as const,
    dependencies: [
      { name: "yard-store", status: "ok" as const },
      { name: "carla-sim", status: "ok" as const },
      { name: "event-bus", status: "ok" as const },
    ],
  };
}

export function getMe() {
  return currentActor();
}

function countByState(req: MockRequest): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const car of req.db.cars) {
    counts[car.state] = (counts[car.state] ?? 0) + 1;
  }
  return counts;
}

export function getOverview(req: MockRequest): Overview {
  const { db } = req;
  const by_state = countByState(req);
  const assistanceOpen = db.assistance.filter((c) => c.status !== "RESOLVED");
  const proposalsPending = db.proposals.filter((p) => p.status === "pending");
  const exceptions = db.cars.filter((c) => c.state === "exception" || c.state === "held");
  const scenariosPending = db.scenarios.filter((s) => s.status === "pending_review");
  const releasesBlocked = db.releases.filter((r) => r.gate === "blocked");

  return {
    plant: currentActor().plant,
    updated_at: new Date().toISOString(),
    cars: {
      total: db.cars.length,
      by_state: by_state as Record<CarState, number>,
      exception: by_state.exception ?? 0,
      held: by_state.held ?? 0,
    },
    assistance_open: assistanceOpen.length,
    proposals_pending: proposalsPending.length,
    lab: {
      scenarios_pending_review: scenariosPending.length,
      releases_blocked: releasesBlocked.length,
    },
    attention: {
      assistance: assistanceOpen,
      proposals: proposalsPending,
    },
    yard_exceptions: exceptions,
  };
}

export function getKpis(req: MockRequest): { items: Kpi[] } {
  const { db } = req;
  const byState = countByState(req);
  const assistanceOpen = db.assistance.filter((c) => c.status !== "RESOLVED").length;
  const proposalsPending = db.proposals.filter((p) => p.status === "pending").length;
  const inspectionTotal = db.inspectionResults.length;
  const inspectionPass = db.inspectionResults.filter((r) => r.verdict === "PASS").length;
  const firstPass = inspectionTotal ? Math.round((inspectionPass / inspectionTotal) * 100) : 0;
  const releasesBlocked = db.releases.filter((r) => r.gate === "blocked").length;

  return {
    items: [
      {
        key: "active",
        label: "Mobil Aktif",
        value: (byState.driving ?? 0) + (byState.waiting_dispatch ?? 0),
        unit: "unit",
        tone: "info",
      },
      {
        key: "assistance_open",
        label: "Assistance Open",
        value: assistanceOpen,
        unit: "case",
        tone: assistanceOpen > 0 ? "danger" : "success",
      },
      {
        key: "proposals_pending",
        label: "Proposal Pending",
        value: proposalsPending,
        unit: "item",
        tone: proposalsPending > 0 ? "warning" : "success",
      },
      {
        key: "exception",
        label: "Exception / Held",
        value: (byState.exception ?? 0) + (byState.held ?? 0),
        unit: "unit",
        tone: (byState.exception ?? 0) > 0 ? "danger" : "default",
      },
      {
        key: "first_pass",
        label: "First-pass Yield",
        value: firstPass,
        unit: "%",
        tone: firstPass >= 80 ? "success" : firstPass >= 60 ? "warning" : "danger",
      },
      {
        key: "releases_blocked",
        label: "Release Blocked",
        value: releasesBlocked,
        unit: "release",
        tone: releasesBlocked > 0 ? "danger" : "success",
      },
    ],
  };
}

export function getInspectionKpis(req: MockRequest) {
  const results = req.db.inspectionResults;
  const total = results.length;
  const pass = results.filter((r) => r.verdict === "PASS").length;
  const review = results.filter((r) => r.verdict === "REVIEW").length;
  const fail = results.filter((r) => r.verdict === "FAIL").length;
  return {
    first_pass_yield: total ? Math.round((pass / total) * 100) : 0,
    review_share: total ? Math.round((review / total) * 100) : 0,
    failure_count: fail,
    period: "shift-ini",
  };
}
