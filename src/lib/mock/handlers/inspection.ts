import type { FunctionalInspection, VisualInspection } from "@/lib/schemas";
import { fail, type MockRequest, paginate, strQuery } from "./helpers";

export function getInspectionResults(req: MockRequest) {
  const kind = strQuery(req.query.kind);
  const verdict = strQuery(req.query.verdict);
  const vin = strQuery(req.query.vin);
  const review = strQuery(req.query.review_status);
  let items = req.db.inspectionResults.slice();
  if (kind) items = items.filter((r) => r.kind === kind);
  if (verdict) items = items.filter((r) => r.verdict === verdict);
  if (vin) items = items.filter((r) => r.vin.toLowerCase().includes(vin.toLowerCase()));
  if (review) items = items.filter((r) => r.review_status === review);
  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return paginate(items, req.query);
}

export function getVisualInspection(req: MockRequest): VisualInspection {
  const vin = req.params.vin;
  const visual = req.db.visual[vin];
  if (!visual) fail(404, `Hasil inspeksi visual ${vin} tidak ditemukan.`, "inspection_not_found");
  return visual;
}

export function getFunctionalInspection(req: MockRequest): FunctionalInspection {
  const vin = req.params.vin;
  const functional = req.db.functional[vin];
  if (!functional)
    fail(404, `Hasil inspeksi fungsional ${vin} tidak ditemukan.`, "inspection_not_found");
  return functional;
}

export function getReports(req: MockRequest) {
  const verdict = strQuery(req.query.verdict);
  const bay = strQuery(req.query.bay);
  const status = strQuery(req.query.status);
  const vin = strQuery(req.query.vin);
  const restrictVin = strQuery(req.query.vin_exact);

  let items = Object.values(req.db.reports);
  if (verdict) items = items.filter((r) => r.verdict === verdict);
  if (vin) items = items.filter((r) => r.vin.toLowerCase().includes(vin.toLowerCase()));
  if (restrictVin) items = items.filter((r) => r.vin === restrictVin);
  if (bay) items = items.filter((r) => r.rework_tickets.some((t) => t.bay === bay));
  if (status) items = items.filter((r) => r.rework_tickets.some((t) => t.status === status));
  items.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return paginate(items, req.query);
}

export function getCarReport(req: MockRequest) {
  const report = req.db.reports[req.params.vin];
  if (!report) fail(404, `Report ${req.params.vin} tidak ditemukan.`, "report_not_found");
  report.rework_tickets = req.db.reworkTickets.filter((t) => t.vin === req.params.vin);
  return report;
}

export function markReworkDone(req: MockRequest) {
  const vin = req.params.vin;
  const actorId = strQuery(req.body.actor_id);
  const actor = req.db.actors.find((a) => a.actor_id === actorId);
  if (!actor) fail(422, "actor_id tidak valid.", "invalid_actor");
  if (actor.role !== "worker") {
    fail(403, "Hanya worker yang dapat menandai perbaikan selesai.", "forbidden");
  }
  const ticket = req.db.reworkTickets.find((t) => t.vin === vin && t.status !== "DONE");
  if (!ticket) fail(404, `Tidak ada tiket rework aktif untuk ${vin}.`, "ticket_not_found");
  ticket.status = "DONE";
  ticket.done_by = actor.actor_id;
  ticket.updated_at = new Date().toISOString();

  const report = req.db.reports[vin];
  if (report) {
    report.rework_tickets = req.db.reworkTickets.filter((t) => t.vin === vin);
    report.reinspection_status = "WAITING";
    report.updated_at = new Date().toISOString();
  }
  const car = req.db.cars.find((c) => c.vin === vin);
  if (car) {
    if (car.flags.includes("rework")) car.flags = car.flags.filter((f) => f !== "rework");
    car.updated_at = new Date().toISOString();
  }
  return { vin, ticket_id: ticket.ticket_id, status: ticket.status, done_by: ticket.done_by };
}
