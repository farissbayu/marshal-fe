import type { Report, ReworkTicket } from "@/lib/schemas";
import { iso } from "./common";

export function reworkTicketsFixture(now: number): ReworkTicket[] {
  return [
    {
      ticket_id: "TKT-001",
      vin: "VIN-001",
      kind: "Body & Paint",
      bay: "BAY-A",
      status: "IN_REPAIR",
      created_at: iso(9, now),
      updated_at: iso(5, now),
      done_by: null,
    },
    {
      ticket_id: "TKT-002",
      vin: "VIN-002",
      kind: "Electrical",
      bay: "BAY-B",
      status: "OPEN",
      created_at: iso(30, now),
      updated_at: iso(30, now),
      done_by: null,
    },
    {
      ticket_id: "TKT-003",
      vin: "VIN-010",
      kind: "Body & Paint",
      bay: "BAY-C",
      status: "DONE",
      created_at: iso(120, now),
      updated_at: iso(35, now),
      done_by: "user-worker-01",
    },
  ];
}

export function reportsFixture(now: number): Record<string, Report> {
  return {
    "VIN-001": {
      vin: "VIN-001",
      verdict: "FAIL",
      confirmed_by: "user-supervisor-01",
      confirmed_at: iso(9, now),
      summary:
        "Visual inspection failed (Flow 3): Physical color Red differs from the build sheet (Blue), left door scratch, and missing rear badge.",
      open_findings: 3,
      visual_findings: [
        {
          zone: "rear_left_door",
          defect_type: "Scratch",
          size: "6 cm",
          confidence: 0.78,
          observation: "6 cm scratch on the rear left door.",
          media_id: "media-002",
        },
        {
          zone: "rear_badge",
          defect_type: "Missing part",
          size: "Emblem missing",
          confidence: 0.95,
          observation: "Rear badge emblem not installed per build sheet.",
          media_id: "media-003",
        },
        {
          zone: "roof",
          defect_type: "Wrong variant",
          size: "Roof rails missing",
          confidence: 0.91,
          observation: "Build sheet lists roof rails, physical unit does not have them.",
          media_id: null,
        },
      ],
      functional_failures: [],
      rework_tickets: [
        {
          ticket_id: "TKT-001",
          vin: "VIN-001",
          kind: "Paint touch-up (20 min)",
          bay: "BAY-PAINT",
          status: "IN_REPAIR",
          created_at: iso(9, now),
          updated_at: iso(5, now),
          done_by: null,
        },
        {
          ticket_id: "TKT-004",
          vin: "VIN-001",
          kind: "Body fit (30 min)",
          bay: "BAY-BODY",
          status: "OPEN",
          created_at: iso(9, now),
          updated_at: iso(9, now),
          done_by: null,
        },
      ],
      reinspection_status: "WAITING",
      updated_at: iso(5, now),
    },
    "VIN-002": {
      vin: "VIN-002",
      verdict: "FAIL",
      confirmed_by: null,
      confirmed_at: null,
      summary:
        "Functional inspection failed (Flow 4): Telemetry vs camera disagreement on the left brake light (out when the pedal is pressed).",
      open_findings: 1,
      visual_findings: [],
      functional_failures: [
        {
          step: 3,
          name: "Brake lights",
          telemetry: "BRAKE_PEDAL_ON",
          camera_result: "LEFT_LAMP_OUT (Fail)",
          confidence: 0.95,
          observation:
            "DISAGREEMENT: Telemetry reports the brake signal active, camera detects the left brake light out.",
          disagree: true,
          media_id: "media-004",
        },
      ],
      rework_tickets: [
        {
          ticket_id: "TKT-002",
          vin: "VIN-002",
          kind: "Electrical (25 min)",
          bay: "BAY-ELEC",
          status: "OPEN",
          created_at: iso(30, now),
          updated_at: iso(30, now),
          done_by: null,
        },
      ],
      reinspection_status: "WAITING",
      updated_at: iso(30, now),
    },
    "VIN-004": {
      vin: "VIN-004",
      verdict: "PASS",
      confirmed_by: "user-inspector-01",
      confirmed_at: iso(85, now),
      summary: "Passed visual inspection with no findings.",
      open_findings: 0,
      visual_findings: [],
      functional_failures: [],
      rework_tickets: [],
      reinspection_status: "PASS",
      updated_at: iso(85, now),
    },
    "VIN-010": {
      vin: "VIN-010",
      verdict: "FAIL",
      confirmed_by: "user-supervisor-01",
      confirmed_at: iso(120, now),
      summary: "Rework done, waiting for reinspection.",
      open_findings: 1,
      visual_findings: [
        {
          zone: "DOOR_RIGHT",
          defect_type: "Scratch",
          size: "10 cm",
          confidence: 0.8,
          observation: "Right door scratch.",
          media_id: null,
        },
      ],
      functional_failures: [],
      rework_tickets: [
        {
          ticket_id: "TKT-003",
          vin: "VIN-010",
          kind: "Body & Paint",
          bay: "BAY-C",
          status: "DONE",
          created_at: iso(120, now),
          updated_at: iso(35, now),
          done_by: "user-worker-01",
        },
      ],
      reinspection_status: "WAITING",
      updated_at: iso(35, now),
    },
  };
}
