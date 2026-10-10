import type { MapPoint, ReworkBay, Zone } from "@/lib/schemas";

export function zonesFixture(): Zone[] {
  return [
    { zone: "ZONE-A", name: "Staging A", closed: false },
    { zone: "ZONE-B", name: "Staging B", closed: true, reason: "Perawatan lantai" },
    { zone: "ZONE-C", name: "Holding C", closed: false },
    { zone: "GATE-IN", name: "Gate Masuk", closed: false },
    { zone: "GATE-OUT", name: "Gate Keluar", closed: false },
  ];
}

export function baysFixture(): ReworkBay[] {
  return [
    {
      bay_id: "BAY-PAINT",
      name: "Paint Touch-up Bay (20 min)",
      capacity: 3,
      occupied: 2,
      status: "near_full",
      active_vins: ["VIN-001"],
    },
    {
      bay_id: "BAY-BODY",
      name: "Body Fit Bay (30 min)",
      capacity: 3,
      occupied: 1,
      status: "open",
      active_vins: ["VIN-001"],
    },
    {
      bay_id: "BAY-ELEC",
      name: "Electrical Bay (25 min)",
      capacity: 2,
      occupied: 1,
      status: "open",
      active_vins: ["VIN-002"],
    },
    {
      bay_id: "BAY-MECH",
      name: "Mechanical Bay (45 min)",
      capacity: 2,
      occupied: 0,
      status: "open",
      active_vins: [],
    },
    {
      bay_id: "BAY-HOLD",
      name: "Production Control Hold (Manual)",
      capacity: 5,
      occupied: 1,
      status: "open",
      active_vins: ["VIN-010"],
    },
  ];
}

export function mapFixture(): MapPoint[] {
  return [
    { id: "GATE-IN", name: "Gate Masuk", kind: "gate", x: 8, y: 50 },
    { id: "GATE-OUT", name: "Gate Keluar", kind: "gate", x: 92, y: 50 },
    { id: "ZONE-A", name: "Staging A", kind: "zone", x: 30, y: 25 },
    { id: "ZONE-B", name: "Staging B", kind: "zone", x: 30, y: 75 },
    { id: "ZONE-C", name: "Holding C", kind: "zone", x: 55, y: 50 },
    { id: "BAY-A", name: "Rework A", kind: "bay", x: 75, y: 25 },
    { id: "BAY-B", name: "Rework B", kind: "bay", x: 75, y: 50 },
    { id: "BAY-C", name: "Rework C", kind: "bay", x: 75, y: 75 },
    { id: "TRACK-1", name: "Track 1", kind: "route", x: 55, y: 15 },
    { id: "TRACK-2", name: "Track 2", kind: "route", x: 55, y: 85 },
  ];
}
