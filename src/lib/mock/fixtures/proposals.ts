import type { Proposal } from "@/lib/schemas";
import { iso } from "./common";

export function proposalsFixture(now: number): Proposal[] {
  return [
    {
      proposal_id: "PROP-001",
      kind: "replan",
      vin: "VIN-006",
      category: "Re-plan rute",
      summary: "Rute ke ZONE-C terblokir obstacle. Usulkan jalur alternatif via ZONE-A.",
      payload: { current_route: "R-12", proposed_route: "R-14", blocker: "obstacle_id=OBS-77" },
      status: "pending",
      allowed_actions: ["approve", "reject"],
      effects: {
        approve: "Kendaraan diarahkan ulang ke R-14 dan misi dilanjutkan.",
        reject: "Kendaraan tetap berhenti di ZONE-C dan menunggu operator.",
      },
      created_at: iso(16, now),
    },
    {
      proposal_id: "PROP-002",
      kind: "inspection_review",
      vin: "VIN-001",
      category: "Review inspeksi visual",
      summary: "Verdict FAIL dengan 3 temuan. Perlu konfirmasi reviewer sebelum rework.",
      payload: { result_id: "RES-001", verdict: "FAIL", findings: 3 },
      status: "pending",
      allowed_actions: ["confirm", "escalate"],
      effects: {
        approve: "Review dikonfirmasi dan tiket rework diterbitkan.",
        reject: "Review dieskalasi ke engineer kualitas.",
      },
      created_at: iso(24, now),
    },
    {
      proposal_id: "PROP-003",
      kind: "rework",
      vin: "VIN-001",
      category: "Konfirmasi rework",
      summary: "Usulan perbaikan cat & body pada HOOD dan DOOR_LEFT.",
      payload: { ticket_id: "TKT-001", bay: "BAY-A", kind: "Body & Paint" },
      status: "pending",
      allowed_actions: ["confirm", "reject"],
      effects: {
        approve: "Tiket TKT-001 dikonfirmasi dan masuk antrean BAY-A.",
        reject: "Tiket ditolak dan kendaraan menunggu keputusan ulang.",
      },
      created_at: iso(12, now),
    },
    {
      proposal_id: "PROP-004",
      kind: "replan",
      vin: "VIN-005",
      category: "Re-plan rute",
      summary: "Kendaraan held karena ZONE-B ditutup. Usulkan pindah ke ZONE-A.",
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
      category: "Konfirmasi rework",
      summary: "Usulan rework lampu depan kiri setelah disagreement telemetry/kamera.",
      payload: { ticket_id: "TKT-002", bay: "BAY-B", kind: "Electrical" },
      status: "pending",
      allowed_actions: ["confirm", "reject"],
      effects: {
        approve: "Tiket TKT-002 dikonfirmasi untuk BAY-B.",
        reject: "Tiket ditolak.",
      },
      created_at: iso(8, now),
    },
    {
      proposal_id: "PROP-010",
      kind: "replan",
      vin: "VIN-003",
      category: "Yard Traffic (Flow 1 Exception)",
      summary:
        "Truk TRK-01 delayed 40 menit. Gemini mengusulkan re-slot 6 mobil agar muatan truk berikutnya (TRK-02) dapat dimuat lebih awal ke bay staging.",
      payload: {
        truck_id: "TRK-01",
        delay_minutes: 40,
        affected_vins: ["VIN-001", "VIN-002", "VIN-003", "VIN-004", "VIN-005", "VIN-006"],
        action: "reslot_to_loading_bay_staging",
      },
      status: "pending",
      allowed_actions: ["approve", "reject"],
      effects: {
        approve: "6 kendaraan di-reslot ulang ke bay muat terdekat. Delay logistik terminimalisir.",
        reject: "Tetap pertahankan slot awal; mobil menunggu truk TRK-01 tiba.",
      },
      created_at: iso(2, now),
    },
  ];
}
