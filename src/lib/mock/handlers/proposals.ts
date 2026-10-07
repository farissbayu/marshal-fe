import type { Proposal } from "@/lib/schemas";
import { fail, type MockRequest, paginate, requireActor, strQuery } from "./helpers";

export function getProposals(req: MockRequest) {
  const kind = strQuery(req.query.kind);
  const status = strQuery(req.query.status);
  let items = req.db.proposals.slice();
  if (kind) items = items.filter((p) => p.kind === kind);
  if (status) items = items.filter((p) => p.status === status);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return paginate(items, req.query);
}

export function getProposal(req: MockRequest): Proposal {
  const proposal = req.db.proposals.find((p) => p.proposal_id === req.params.proposal_id);
  if (!proposal)
    fail(404, `Proposal ${req.params.proposal_id} tidak ditemukan.`, "proposal_not_found");
  return proposal;
}

export function decideProposal(req: MockRequest) {
  const proposal = req.db.proposals.find((p) => p.proposal_id === req.params.proposal_id);
  if (!proposal)
    fail(404, `Proposal ${req.params.proposal_id} tidak ditemukan.`, "proposal_not_found");
  if (proposal.status !== "pending") {
    fail(
      409,
      "Proposal sudah diputuskan oleh pihak lain. Muat ulang data.",
      "proposal_already_decided",
    );
  }
  const actorId = strQuery(req.body.actor_id);
  requireActor(req.db, actorId);
  const decision = strQuery(req.body.decision);
  if (!decision) fail(422, "Keputusan wajib diisi.", "validation_error");

  const alias: Record<string, string> = {
    approve: "approve",
    reject: "reject",
    confirm: "confirm",
    escalate: "escalate",
  };
  const normalized = alias[decision];
  if (!normalized) fail(422, `Keputusan '${decision}' tidak dikenal.`, "validation_error");
  const requiresConfirm = proposal.allowed_actions.includes("confirm");
  const valid =
    proposal.allowed_actions.includes(normalized) ||
    (normalized === "approve" && requiresConfirm) ||
    (normalized === "reject" && requiresConfirm);
  if (!valid) {
    fail(422, `Aksi '${decision}' tidak diizinkan untuk proposal ini.`, "action_not_allowed");
  }

  const statusMap: Record<string, Proposal["status"]> = {
    approve: "approved",
    confirm: "approved",
    reject: "rejected",
    escalate: "escalated",
  };
  proposal.status = statusMap[normalized];
  proposal.decision = normalized;
  proposal.decided_by = actorId ?? null;
  proposal.decided_at = new Date().toISOString();

  if (proposal.kind === "rework" && normalized !== "reject") {
    const ticketId = strQuery((proposal.payload as Record<string, unknown>).ticket_id);
    const ticket = req.db.reworkTickets.find((t) => t.ticket_id === ticketId);
    if (ticket && ticket.status === "OPEN") {
      ticket.status = "IN_REPAIR";
      ticket.updated_at = new Date().toISOString();
    }
  }
  if (proposal.kind === "inspection_review" && normalized === "confirm") {
    const resultId = strQuery((proposal.payload as Record<string, unknown>).result_id);
    const result = req.db.inspectionResults.find((r) => r.result_id === resultId);
    if (result) result.review_status = "DONE";
    if (proposal.vin) {
      const visual = req.db.visual[proposal.vin];
      if (visual) {
        visual.review_status = "DONE";
        visual.reviewed_by = actorId ?? null;
        visual.review_decision = "confirm";
      }
    }
  }

  return {
    proposal_id: proposal.proposal_id,
    status: proposal.status,
    decision: proposal.decision,
    decided_by: proposal.decided_by,
    decided_at: proposal.decided_at,
  };
}
