import type { AssistanceCase } from "@/lib/schemas";
import { iso } from "./common";

export function assistanceFixture(now: number): AssistanceCase[] {
  return [
    {
      case_id: "case-01",
      vin: "VIN-005",
      location: "Finishing Corner · Lane B",
      situation:
        "Cardboard box in lane near finishing, car VIN-005 stopped 4 m before it with a worker nearby.",
      status: "OPEN",
      opened_at: iso(4, now),
      escalation: null,
      moving_people_or_equipment: true,
      risk_note:
        "Pekerja berada 3 m dari rintangan. Sesuai protokol keselamatan: opsi 'wait' adalah satu-satunya rekomendasi yang diizinkan.",
      recommendation: {
        option_id: "WAIT_OPERATOR",
        confidence: 0.95,
        note: "Pekerja terdeteksi 3 m di dekat kardus. Sesuai aturan keselamatan: hanya opsi 'wait' yang direkomendasikan saat ada orang di jalur.",
      },
      options: [
        {
          id: "WAIT_OPERATOR",
          label: "A · Tunggu pembersihan (Wait)",
          risk: "low",
          reason: "Paling aman: tunggu pekerja memindahkan kardus dari jalur lintasan.",
          rank: 1,
        },
        {
          id: "BYPASS_LEFT",
          label: "B · Lewati via lajur kiri kosong @ 3 km/h",
          risk: "high",
          reason: "Lajur kiri kosong, namun ada pekerja 3 m di sisi kanan (risiko tinggi).",
          rank: 2,
        },
        {
          id: "REROUTE_C",
          label: "C · Alihkan rute via lajur C (+2 min)",
          risk: "medium",
          reason: "Rute alternatif aman mengitari area, menambah 2 menit waktu tempuh.",
          rank: 3,
        },
      ],
      media_ids: ["media-001"],
      detected_objects: [
        { label: "Obstacle (Box)", box: [450, 400, 750, 600], confidence: 0.89 },
        { label: "Worker", box: [300, 720, 680, 850], confidence: 0.94 },
      ],
      resolved_by: null,
      resolved_at: null,
      chosen_option: null,
      result: null,
    },
    {
      case_id: "case-02",
      vin: "VIN-006",
      location: "ZONE-C, Bay 3",
      situation: "Peralatan bergerak terdeteksi di jalur keluar.",
      status: "ESCALATED",
      opened_at: iso(12, now),
      escalation: "Menunggu supervisor lapangan",
      moving_people_or_equipment: true,
      risk_note: "Forklift aktif beroperasi di dekat jalur.",
      recommendation: {
        option_id: "HOLD",
        confidence: 0.74,
        note: "Tahan kendaraan hingga jalur bersih.",
      },
      options: [
        {
          id: "HOLD",
          label: "Tahan kendaraan",
          risk: "low",
          reason: "Paling aman selama forklift aktif.",
          rank: 1,
        },
        {
          id: "REROUTE",
          label: "Alihkan rute",
          risk: "medium",
          reason: "Rute alternatif lebih panjang.",
          rank: 2,
        },
      ],
      media_ids: ["media-003"],
      detected_objects: [],
      resolved_by: null,
      resolved_at: null,
      chosen_option: null,
      result: null,
    },
    {
      case_id: "case-03",
      vin: "VIN-007",
      location: "ZONE-A, Bay 11",
      situation: "Kendaraan berhenti mendadak karena sensor.",
      status: "RESOLVED",
      opened_at: iso(48, now),
      escalation: null,
      moving_people_or_equipment: false,
      risk_note: null,
      recommendation: { option_id: "RESUME", confidence: 0.91 },
      options: [
        { id: "RESUME", label: "Lanjutkan", risk: "low", reason: "Tidak ada hambatan.", rank: 1 },
        {
          id: "WAIT_OPERATOR",
          label: "Tunggu operator",
          risk: "low",
          reason: "Verifikasi manual.",
          rank: 2,
        },
      ],
      media_ids: [],
      detected_objects: [],
      resolved_by: "user-supervisor-01",
      resolved_at: iso(45, now),
      chosen_option: "RESUME",
      result: "Kendaraan dilanjutkan, jalur bersih.",
    },
  ];
}
