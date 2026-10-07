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
  if (!found) fail(404, `Case ${req.params.case_id} tidak ditemukan.`, "case_not_found");
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
    period: "shift-ini",
  };
}

export function decideAssistance(req: MockRequest) {
  const found = req.db.assistance.find((c) => c.case_id === req.params.case_id);
  if (!found) fail(404, `Case ${req.params.case_id} tidak ditemukan.`, "case_not_found");
  if (found.status === "RESOLVED") {
    fail(409, "Case sudah diselesaikan. Muat ulang data.", "case_already_resolved");
  }
  const actorId = strQuery(req.body.actor_id);
  const actor = requireActor(req.db, actorId);
  const option = strQuery(req.body.option);
  if (!option) fail(422, "Opsi keputusan wajib dipilih.", "validation_error");

  const allowed = found.options.some((o) => o.id === option);
  if (!allowed) {
    fail(422, `Opsi '${option}' tidak ditawarkan oleh sistem.`, "option_not_allowed");
  }

  found.status = "RESOLVED";
  found.chosen_option = option;
  found.resolved_by = actor.actor_id;
  found.resolved_at = new Date().toISOString();
  const chosen = found.options.find((o) => o.id === option);
  found.result = `Keputusan '${chosen?.label ?? option}' dikirim. Kendaraan dilanjutkan sesuai opsi.`;

  return {
    case_id: found.case_id,
    status: found.status,
    chosen_option: found.chosen_option,
    resolved_by: found.resolved_by,
    resolved_at: found.resolved_at,
    result: found.result,
  };
}
