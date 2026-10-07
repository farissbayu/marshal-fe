import { startJob } from "../jobs";
import { fail, type MockRequest, paginate, requireActor, strQuery } from "./helpers";

export function getTestRequests(req: MockRequest) {
  const status = strQuery(req.query.status);
  let items = req.db.testRequests.slice();
  if (status) items = items.filter((r) => r.status === status);
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return paginate(items, req.query);
}

export function getScenarios(req: MockRequest) {
  const status = strQuery(req.query.status);
  const tag = strQuery(req.query.tag);
  let items = req.db.scenarios.slice();
  if (status) items = items.filter((s) => s.status === status);
  if (tag) items = items.filter((s) => s.tags.includes(tag));
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return paginate(items, req.query);
}

export function getScenario(req: MockRequest) {
  const scenario = req.db.scenarioDetails[req.params.scenario_id];
  if (!scenario)
    fail(404, `Scenario ${req.params.scenario_id} tidak ditemukan.`, "scenario_not_found");
  return scenario;
}

export function createScenario(req: MockRequest) {
  const situation = strQuery(req.body.situation);
  if (!situation || situation.trim().length < 5) {
    fail(422, "Deskripsi situasi minimal 5 karakter.", "validation_error");
  }
  const source = strQuery(req.body.source) ?? "manual";
  const requestId = strQuery(req.body.request_id);

  if (requestId) {
    const request = req.db.testRequests.find((r) => r.request_id === requestId);
    if (request) request.status = "processing";
  } else {
    req.db.requestSeq += 1;
    req.db.testRequests.unshift({
      request_id: `TRQ-${String(req.db.requestSeq).padStart(3, "0")}`,
      source,
      text: situation,
      created_at: new Date().toISOString(),
      status: "processing",
      scenario_id: null,
    });
  }

  const job = startJob(req.db, "scenario_generation", { situation, source, request_id: requestId });
  return { job_id: job.job_id, status: job.status };
}

export function reviewScenario(req: MockRequest) {
  const scenario = req.db.scenarioDetails[req.params.scenario_id];
  if (!scenario)
    fail(404, `Scenario ${req.params.scenario_id} tidak ditemukan.`, "scenario_not_found");
  if (scenario.status !== "pending_review") {
    fail(409, "Skenario sudah direview. Muat ulang data.", "scenario_already_reviewed");
  }
  const actorId = strQuery(req.body.actor_id);
  const actor = requireActor(req.db, actorId);
  if (actor.role !== "engineer") {
    fail(403, "Hanya engineer yang dapat mereview skenario.", "forbidden");
  }
  const decision = strQuery(req.body.decision);
  if (decision !== "approved" && decision !== "rejected") {
    fail(422, "Keputusan harus 'approved' atau 'rejected'.", "validation_error");
  }
  const note = strQuery(req.body.note);
  const now = new Date().toISOString();
  scenario.review = { decision, actor_id: actor.actor_id, note, at: now };
  scenario.status = decision === "approved" ? "runnable" : "rejected";
  const listItem = req.db.scenarios.find((s) => s.scenario_id === scenario.scenario_id);
  if (listItem) listItem.status = scenario.status;
  return { scenario_id: scenario.scenario_id, status: scenario.status, review: scenario.review };
}

export function adversarialSearch(req: MockRequest) {
  const scenario = req.db.scenarioDetails[req.params.scenario_id];
  if (!scenario)
    fail(404, `Scenario ${req.params.scenario_id} tidak ditemukan.`, "scenario_not_found");
  if (scenario.status !== "approved" && scenario.status !== "runnable") {
    fail(409, "Skenario belum runnable untuk adversarial search.", "scenario_not_runnable");
  }
  const job = startJob(req.db, "adversarial_search", { scenario_id: scenario.scenario_id });
  return { job_id: job.job_id, status: job.status };
}

export function getReleases(req: MockRequest) {
  const items = req.db.releases.slice();
  items.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return paginate(items, req.query);
}

export function getRelease(req: MockRequest) {
  const release = req.db.releases.find((r) => r.release_id === req.params.release_id);
  if (!release) fail(404, `Release ${req.params.release_id} tidak ditemukan.`, "release_not_found");
  return release;
}

export function evaluateRelease(req: MockRequest) {
  const release = req.db.releases.find((r) => r.release_id === req.params.release_id);
  if (!release) fail(404, `Release ${req.params.release_id} tidak ditemukan.`, "release_not_found");
  if (release.evaluation_status === "running") {
    fail(409, "Evaluasi sedang berjalan.", "evaluation_running");
  }
  release.evaluation_status = "running";
  release.updated_at = new Date().toISOString();
  const job = startJob(req.db, "release_evaluate", { release_id: release.release_id });
  return { job_id: job.job_id, status: job.status };
}

export function approveRelease(req: MockRequest) {
  const release = req.db.releases.find((r) => r.release_id === req.params.release_id);
  if (!release) fail(404, `Release ${req.params.release_id} tidak ditemukan.`, "release_not_found");
  const actorId = strQuery(req.body.actor_id);
  const actor = requireActor(req.db, actorId);
  if (actor.role !== "engineer") {
    fail(403, "Hanya engineer yang dapat menyetujui release.", "forbidden");
  }
  if (release.approved_by) {
    fail(409, "Release sudah disetujui.", "release_already_approved");
  }
  if (release.evaluation_status !== "done") {
    fail(409, "Evaluasi belum selesai. Jalankan evaluasi terlebih dahulu.", "evaluation_not_done");
  }
  if (release.failed > 0 || release.gate === "blocked") {
    fail(409, "Gate tidak lulus. Release tidak dapat disetujui.", "gate_blocked");
  }
  release.gate = "approved";
  release.approved_by = actor.actor_id;
  release.approved_at = new Date().toISOString();
  release.updated_at = release.approved_at;
  return {
    release_id: release.release_id,
    gate: release.gate,
    approved_by: release.approved_by,
    approved_at: release.approved_at,
  };
}

export function getJob(req: MockRequest) {
  const job = req.db.jobs.find((j) => j.job_id === req.params.job_id);
  if (!job)
    fail(
      404,
      `Job ${req.params.job_id} tidak ditemukan (mungkin hilang setelah restart).`,
      "job_not_found",
    );
  return job;
}
