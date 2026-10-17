import type { Proposal } from "@/lib/schemas";
import { iso } from "./common";

export function proposalsFixture(now: number): Proposal[] {
  return [
    {
      proposal_id: "PROP-001",
      kind: "replan",
      vin: "VIN-006",
      category: "Re-plan route",
      summary: "Route to ZONE-C blocked by obstacle. Propose an alternative route via ZONE-A.",
      payload: { current_route: "R-12", proposed_route: "R-14", blocker: "obstacle_id=OBS-77" },
      status: "pending",
      allowed_actions: ["approve", "reject"],
      effects: {
        approve: "Vehicle rerouted to R-14 and mission resumed.",
        reject: "Vehicle remains stopped in ZONE-C and waits for an operator.",
      },
      created_at: iso(16, now),
    },
    {
      proposal_id: "PROP-002",
      kind: "inspection_review",
      vin: "VIN-001",
      category: "Visual inspection review",
      summary: "Verdict FAIL with 3 findings. Reviewer confirmation required before rework.",
      payload: { result_id: "RES-001", verdict: "FAIL", findings: 3 },
      status: "pending",
      allowed_actions: ["confirm", "escalate"],
      effects: {
        approve: "Review confirmed and rework ticket issued.",
        reject: "Review escalated to the quality engineer.",
      },
      created_at: iso(24, now),
    },
    {
      proposal_id: "PROP-003",
      kind: "rework",
      vin: "VIN-001",
      category: "Rework confirmation",
      summary: "Proposed paint & body repair on HOOD and DOOR_LEFT.",
      payload: { ticket_id: "TKT-001", bay: "BAY-A", kind: "Body & Paint" },
      status: "pending",
      allowed_actions: ["confirm", "reject"],
      effects: {
        approve: "Ticket TKT-001 confirmed and queued to BAY-A.",
        reject: "Ticket rejected and the vehicle waits for a new decision.",
      },
      created_at: iso(12, now),
    },
    {
      proposal_id: "PROP-004",
      kind: "replan",
      vin: "VIN-005",
      category: "Re-plan route",
      summary: "Vehicle held because ZONE-B is closed. Propose moving to ZONE-A.",
      payload: { current_route: "R-03", proposed_route: "R-05" },
      status: "approved",
      allowed_actions: [],
      created_at: iso(70, now),
      decided_at: iso(60, now),
      decided_by: "user-supervisor-01",
      decision: "approve",
    },
    {
      proposal_id: "PROP-005",
      kind: "rework",
      vin: "VIN-002",
      category: "Rework confirmation",
      summary: "Proposed rework of the left headlight after a telemetry/camera disagreement.",
      payload: { ticket_id: "TKT-002", bay: "BAY-B", kind: "Electrical" },
      status: "pending",
      allowed_actions: ["confirm", "reject"],
      effects: {
        approve: "Ticket TKT-002 confirmed for BAY-B.",
        reject: "Ticket rejected.",
      },
      created_at: iso(8, now),
    },
    {
      proposal_id: "PROP-010",
      kind: "replan",
      vin: "VIN-003",
      category: "Yard Traffic (Flow 1 Exception)",
      summary:
        "Truck TRK-01 delayed 40 minutes. Gemini proposes re-slotting 6 cars so the next truck's load (TRK-02) can be loaded earlier into the staging bay.",
      payload: {
        truck_id: "TRK-01",
        delay_minutes: 40,
        affected_vins: ["VIN-001", "VIN-002", "VIN-003", "VIN-004", "VIN-005", "VIN-006"],
        action: "reslot_to_loading_bay_staging",
      },
      status: "pending",
      allowed_actions: ["approve", "reject"],
      effects: {
        approve: "6 vehicles reslotted to the nearest loading bay. Logistics delay minimized.",
        reject: "Keep the original slot; cars wait for truck TRK-01 to arrive.",
      },
      created_at: iso(2, now),
    },
  ];
}
