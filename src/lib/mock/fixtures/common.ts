import type { Actor, Media } from "@/lib/schemas";

export const VINS = [
  "VIN-001",
  "VIN-002",
  "VIN-003",
  "VIN-004",
  "VIN-005",
  "VIN-006",
  "VIN-007",
  "VIN-008",
  "VIN-009",
  "VIN-010",
  "VIN-011",
  "VIN-012",
] as const;

export function iso(minutesAgo: number, now: number): string {
  return new Date(now - minutesAgo * 60_000).toISOString();
}

export function isoAhead(minutes: number, now: number): string {
  return new Date(now + minutes * 60_000).toISOString();
}

export function actors(): Actor[] {
  return [
    {
      actor_id: "user-supervisor-01",
      display_name: "Fariss Bayu",
      role: "supervisor",
      plant: "Plant 01 · Pasuruan",
      permissions: ["assistance.decide", "proposal.decide", "rework.confirm", "yard.action"],
    },
    {
      actor_id: "user-inspector-01",
      display_name: "Rani Inspector",
      role: "inspector",
      plant: "Plant 01 · Pasuruan",
      permissions: ["inspection.review", "quality.read"],
    },
    {
      actor_id: "user-worker-01",
      display_name: "Budi Worker",
      role: "worker",
      plant: "Plant 01 · Pasuruan",
      permissions: ["rework.done"],
    },
    {
      actor_id: "user-engineer-01",
      display_name: "Andi Engineer",
      role: "engineer",
      plant: "Plant 01 · Pasuruan",
      permissions: ["scenario.review", "release.evaluate", "release.approve", "lab.run"],
    },
  ];
}

function svg(label: string, color: string): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"><rect width="480" height="270" fill="#101215"/><rect x="16" y="16" width="448" height="238" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="6 6"/><circle cx="240" cy="120" r="46" fill="none" stroke="${color}" stroke-width="3"/><text x="240" y="128" fill="${color}" font-family="monospace" font-size="26" text-anchor="middle">${label}</text><text x="240" y="215" fill="#8b9199" font-family="monospace" font-size="14" text-anchor="middle">MOCK EVIDENCE</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
}

export function mediaFixtures(): Media[] {
  return [
    {
      media_id: "media-001",
      kind: "clip",
      content_type: "image/svg+xml",
      url: svg("CASE CLIP", "#f2645a"),
      available: true,
    },
    {
      media_id: "media-002",
      kind: "image",
      content_type: "image/svg+xml",
      url: svg("HOOD", "#e0b341"),
      available: true,
    },
    {
      media_id: "media-003",
      kind: "image",
      content_type: "image/svg+xml",
      url: "",
      available: false,
      expires_at: new Date().toISOString(),
    },
    {
      media_id: "media-004",
      kind: "image",
      content_type: "image/svg+xml",
      url: svg("LIGHT", "#5aa9e6"),
      available: true,
    },
    {
      media_id: "media-005",
      kind: "clip",
      content_type: "image/svg+xml",
      url: svg("TRACK", "#5ac27a"),
      available: true,
    },
  ];
}
