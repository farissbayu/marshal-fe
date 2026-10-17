import type { FlowEvent } from "./schemas";

export interface FeedRow {
  key: number;
  t: string;
  tag: string;
  tone: string;
  text: string;
  probs: [string, number][];
}

const TONE_BY_LEVEL: Record<string, string> = {
  info: "blue",
  good: "emerald",
  warn: "amber",
  bad: "rose",
};

/** The newest `limit` decisions as rows: probabilities kept structured, telemetry left out. */
export function feedRows(events: FlowEvent[], limit = 14, onlyExceptions = false): FeedRow[] {
  return (
    events
      // A decision feed: per-step track telemetry and plain vehicle status are not decisions.
      .filter((e) => e.source !== "track-steps")
      .filter((e) => !(e.source === "vehicle-status" && e.level === "info"))
      .filter((e) => !onlyExceptions || e.level === "warn" || e.level === "bad")
      .slice(-limit)
      .reverse()
      .map((e) => ({
        key: e.seq,
        t: clock(e.at),
        tag: e.source,
        tone: TONE_BY_LEVEL[e.level] ?? "gray",
        text: e.detail ? `${e.title} — ${e.detail}` : e.title,
        probs: Object.entries((e.data?.probs ?? {}) as Record<string, unknown>).filter(
          (entry): entry is [string, number] => typeof entry[1] === "number",
        ),
      }))
  );
}

export function clock(at: string): string {
  if (!at.includes("T")) return at; // the marshal_ai dashboard already sends HH:MM:SS
  const when = new Date(at);
  return Number.isNaN(when.getTime())
    ? at.slice(11, 19)
    : when.toLocaleTimeString("en-GB", { hour12: false });
}
