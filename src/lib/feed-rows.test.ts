import { describe, expect, it } from "vitest";
import { feedRows } from "./feed-rows";
import type { FlowEvent } from "./schemas";

const event = (seq: number, over: Partial<FlowEvent> = {}): FlowEvent => ({
  seq,
  at: "2026-10-17T06:39:12Z",
  flow: 1,
  source: "route",
  title: `t${seq}`,
  detail: "",
  level: "info",
  ...over,
});

describe("feedRows", () => {
  it("returns the newest events first, capped at the limit", () => {
    const rows = feedRows([event(1), event(2), event(3)], 2);
    expect(rows.map((r) => r.key)).toEqual([3, 2]);
  });

  it("formats the timestamp as a local clock and maps the level to a chip tone", () => {
    const [row] = feedRows([event(1, { level: "warn" })]);
    expect(row.t).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(row.tone).toBe("amber");
  });

  it("keeps HH:MM:SS timestamps from the marshal_ai dashboard as they are", () => {
    expect(feedRows([event(1, { at: "06:39:12" })])[0].t).toBe("06:39:12");
  });

  it("leaves telemetry out but keeps arrivals, verdicts and decisions", () => {
    const rows = feedRows([
      event(1, { source: "vehicle-status", level: "info", title: "VIN-1 at finishing" }),
      event(2, { source: "track-steps", title: "VIN-1 track step 4: reverse" }),
      event(3, { source: "vehicle-status", level: "good", title: "VIN-1 arrived at yard.Y1" }),
      event(4, {
        source: "inspection-results",
        level: "good",
        title: "VIN-1 inspection verdict PASS",
      }),
      event(5, { source: "route", title: "VIN-1 → via lane_c" }),
    ]);
    expect(rows.map((r) => r.key)).toEqual([5, 4, 3]);
  });

  it("keeps structured probabilities when present", () => {
    const [row] = feedRows([
      event(1, {
        data: { choice: "via lane_c", probs: { "via lane_c": 1, "via finishing_corner": 0 } },
      }),
    ]);
    expect(row.probs).toEqual([
      ["via lane_c", 1],
      ["via finishing_corner", 0],
    ]);
  });

  it("has no pills without a numeric decision payload", () => {
    expect(feedRows([event(1)])[0].probs).toEqual([]);
    expect(feedRows([event(1, { data: { probs: { a: "x" } } })])[0].probs).toEqual([]);
  });

  it("keeps only warnings and failures when asked for exceptions", () => {
    const rows = feedRows(
      [
        event(1, { source: "route", level: "info", title: "VIN-1 → via lane_c" }),
        event(2, { source: "assistance", level: "warn", title: "VIN-2 asked for help" }),
        event(3, { source: "inspection-results", level: "bad", title: "VIN-3 verdict FAIL" }),
      ],
      14,
      true,
    );
    expect(rows.map((r) => r.key)).toEqual([3, 2]);
  });
});
