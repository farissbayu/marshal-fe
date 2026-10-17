import { afterEach, describe, expect, it, vi } from "vitest";
import type { BatchReport } from "@/lib/schemas";
import { createDb } from "./db";
import {
  cancelBatch,
  createBatch,
  getBatch,
  getBatchEvents,
  getBatchReport,
  materializeBatches,
} from "./handlers/batches";
import type { MockRequest } from "./handlers/helpers";

function request(
  db: ReturnType<typeof createDb>,
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
): MockRequest {
  return { method: "GET", path: "/batches", query: {}, body, params, db };
}

describe("mock batch endpoints", () => {
  afterEach(() => vi.useRealTimers());

  it("simulates progress, events, incident lab and a seven-flow report", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const db = createDb();
    const req = request(db, { cars: 3 });
    const accepted = createBatch(req);
    expect(accepted.status).toBe("queued");
    const batchId = String(accepted.batch_id);

    materializeBatches(req);
    vi.advanceTimersByTime(16_000);
    materializeBatches(req);
    expect(getBatch(request(db, {}, { batch_id: batchId })).progress).toBeGreaterThan(70);

    vi.advanceTimersByTime(5_000);
    materializeBatches(req);
    const detail = getBatch(request(db, {}, { batch_id: batchId }));
    expect(detail.status).toBe("done");
    expect(detail.flow_counts.flow6.status).toBe("generated");
    expect(detail.cars).toHaveLength(3);
    expect(
      getBatchEvents(request(db, { since: 0 }, { batch_id: batchId })).items.length,
    ).toBeGreaterThan(20);
    expect(
      (getBatchReport(request(db, {}, { batch_id: batchId })) as BatchReport).gemini.per_flow,
    ).toHaveLength(7);
  });

  it("validates batch size and stops a running mock", () => {
    const db = createDb();
    expect(() => createBatch(request(db, { cars: 7 }))).toThrow();
    const accepted = createBatch(request(db, { cars: 1 }));
    const result = cancelBatch(request(db, {}, { batch_id: String(accepted.batch_id) }));
    expect(result.status).toBe("cancelled");
    expect(getBatch(request(db, {}, { batch_id: String(accepted.batch_id) })).status).toBe(
      "cancelled",
    );
    expect(() =>
      getBatchReport(request(db, {}, { batch_id: String(accepted.batch_id) })),
    ).toThrow();
  });
});
