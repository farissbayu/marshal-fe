import { describe, expect, it } from "vitest";
import { parseEvents } from "./use-event-stream";

const event = (seq: number) => ({
  seq,
  at: "2026-10-17T06:39:00Z",
  flow: 1,
  source: "route",
  title: `t${seq}`,
  detail: "",
  level: "info",
});

describe("parseEvents", () => {
  it("parses a single event (marshal_api SSE)", () => {
    expect(parseEvents(JSON.stringify(event(1)))).toHaveLength(1);
  });

  it("parses a batch array (marshal_ai dashboard SSE)", () => {
    const parsed = parseEvents(JSON.stringify([event(1), event(2)]));
    expect(parsed.map((e) => e.seq)).toEqual([1, 2]);
  });

  it("drops malformed events without throwing", () => {
    expect(parseEvents(JSON.stringify([event(1), { nope: true }]))).toHaveLength(1);
    expect(parseEvents("not json")).toEqual([]);
  });

  it("keeps a structured decision payload", () => {
    const parsed = parseEvents(
      JSON.stringify({
        ...event(1),
        data: { choice: "via lane_c", probs: { "via lane_c": 1 } },
      }),
    );
    expect(parsed[0].data).toEqual({ choice: "via lane_c", probs: { "via lane_c": 1 } });
  });
});
