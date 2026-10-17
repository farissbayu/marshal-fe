import type { AssistanceCase, AssistanceKpis } from "@/lib/schemas";
import { fail, type MockRequest, paginate, requireActor, strQuery } from "./helpers";

function urgencyScore(c: AssistanceCase): number {
  return (c.moving_people_or_equipment ? 1000 : 0) + (c.status === "ESCALATED" ? 500 : 0);
}

export function getAssistanceCases(req: MockRequest) {
  const open = strQuery(req.query.open);
  let items = req.db.assistance.slice();
  if (open === "true") items = items.filter((c) => c.status !== "RESOLVED");
  items.sort((a, b) => {
    const urgent = urgencyScore(b) - urgencyScore(a);
    if (urgent !== 0) return urgent;
    return a.opened_at < b.opened_at ? -1 : 1;
  });
  return paginate(items, req.query);
}

export function getAssistanceCase(req: MockRequest): AssistanceCase {
  const found = req.db.assistance.find((c) => c.case_id === req.params.case_id);
  if (!found) fail(404, `Case ${req.params.case_id} not found.`, "case_not_found");
  return found;
}

export function getAssistanceKpis(req: MockRequest): AssistanceKpis {
  const cases = req.db.assistance;
  const resolved = cases.filter((c) => c.status === "RESOLVED");
  const latencies = resolved
    .filter((c) => c.resolved_at)
    .map(
      (c) =>
        (new Date(c.resolved_at as string).getTime() - new Date(c.opened_at).getTime()) / 60000,
    );
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  return {
    open: cases.filter((c) => c.status !== "RESOLVED").length,
    resolved: resolved.length,
    avg_latency_minutes: Math.round(avg * 10) / 10,
    period: "this shift",
  };
}

export function decideAssistance(req: MockRequest) {
  const found = req.db.assistance.find((c) => c.case_id === req.params.case_id);
  if (!found) fail(404, `Case ${req.params.case_id} not found.`, "case_not_found");
  if (found.status === "RESOLVED") {
    fail(409, "Case already resolved. Reload data.", "case_already_resolved");
  }
  const actorId = strQuery(req.body.actor_id);
  const actor = requireActor(req.db, actorId);
  const option = strQuery(req.body.option);
  if (!option) fail(422, "A decision option is required.", "validation_error");

  const allowed = found.options.some((o) => o.id === option);
  if (!allowed) {
    fail(422, `Option '${option}' is not offered by the system.`, "option_not_allowed");
  }

  found.status = "RESOLVED";
  found.chosen_option = option;
  found.resolved_by = actor.actor_id;
  found.resolved_at = new Date().toISOString();
  const chosen = found.options.find((o) => o.id === option);
  found.result = `Decision '${chosen?.label ?? option}' sent. Vehicle resumes per the selected option.`;

  return {
    case_id: found.case_id,
    status: found.status,
    chosen_option: found.chosen_option,
    resolved_by: found.resolved_by,
    resolved_at: found.resolved_at,
    result: found.result,
  };
}

export function ingestAssistanceCase(req: MockRequest): AssistanceCase {
  const vin = strQuery(req.body.vin) || "VIN-NEW";
  const location = strQuery(req.body.location) || "unknown";
  const situation = strQuery(req.body.situation) || "Obstacle reported";
  const rawOptions = Array.isArray(req.body.options) ? req.body.options : ["Wait for clearance", "Reroute"];
  const newCaseId = `case-${req.db.assistance.length + 1}`;
  const options = rawOptions.map((opt: string, i: number) => ({
    id: `opt-${i + 1}`,
    label: opt,
    risk: (i === 0 ? "low" : i === 1 ? "medium" : "high") as "low" | "medium" | "high",
    reason: `Candidate action ${i + 1}`,
  }));

  const newCase: AssistanceCase = {
    case_id: newCaseId,
    vin,
    location,
    situation,
    status: "OPEN",
    opened_at: new Date().toISOString(),
    moving_people_or_equipment: false,
    recommendation: options[0] ? { option_id: options[0].id, confidence: 0.85 } : null,
    options,
    media_ids: [],
    detected_objects: [],
    clip_uri: strQuery(req.body.clip_uri) || null,
  };

  req.db.assistance.unshift(newCase);
  return newCase;
}
