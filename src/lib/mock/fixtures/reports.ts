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
        "Gagal inspeksi visual (Flow 3): Warna fisik Merah berbeda dengan build sheet (Biru), goresan pintu kiri, dan badge belakang hilang.",
      open_findings: 3,
      visual_findings: [
        {
          zone: "rear_left_door",
          defect_type: "Scratch",
          size: "6 cm",
          confidence: 0.78,
          observation: "Goresan 6 cm pada pintu belakang kiri (scratch rear left door).",
          media_id: "media-002",
        },
        {
          zone: "rear_badge",
          defect_type: "Missing part",
          size: "Emblem missing",
          confidence: 0.95,
          observation: "Badge emblem belakang tidak terpasang sesuai build sheet.",
          media_id: "media-003",
        },
        {
          zone: "roof",
          defect_type: "Wrong variant",
          size: "Roof rails missing",
          confidence: 0.91,
          observation: "Build sheet mencatat roof rails, unit fisik tidak terpasang.",
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
        "Gagal inspeksi fungsional (Flow 4): Disagreement telemetri vs kamera pada lampu rem kiri (mati saat pedal ditekan).",
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
            "DISAGREEMENT: Telemetri melaporkan sinyal rem aktif, kamera mendeteksi lampu rem kiri mati.",
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
      summary: "Lolos inspeksi visual tanpa temuan.",
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
      summary: "Rework selesai, menunggu reinspection.",
      open_findings: 1,
      visual_findings: [
        {
          zone: "DOOR_RIGHT",
          defect_type: "Scratch",
          size: "10 cm",
          confidence: 0.8,
          observation: "Goresan pintu kanan.",
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
