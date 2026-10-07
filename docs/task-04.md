# Task 04 — Inspection, Report & Rework

## Tujuan

Implementasi halaman Quality & Inspections dan Reports & Rework. Quality operator dapat membaca hasil inspeksi visual/functional, melakukan review decision, melihat laporan lengkap per VIN, serta memantau status rework per bay. Worker dapat menandai repair selesai. UI tidak boleh menyatakan PASS tanpa hasil dari backend.

## Techstack yang Digunakan

- **TanStack Query** — `useQuery` untuk list/detail, `useMutation` untuk review dan mark done
- **TanStack Router** — route `/quality/inspections`, `/quality/rework`, search params untuk filter
- **shadcn/ui** — Table, Tabs, Badge, Dialog, Skeleton, Alert, Card
- **Zod** — validasi shape response inspection, report, rework
- **Zustand** — `useAuthStore` untuk actor_id dan role guard (hanya supervisor/inspector yang bisa review)

---

## Halaman 1: Quality & Inspections (`/quality/inspections`)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Quality & Inspections                                        │
├──────────────────────────────────────────────────────────────┤
│ KPI: First-pass yield | Review share | Failure count         │
├──────────────────────────────────────────────────────────────┤
│ Filter: Verdict [PASS|REVIEW|FAIL] | Jenis [Visual|Funct]    │
│         VIN search | Periode                                 │
├─────┬──────────┬──────────┬───────────┬──────────┬──────────┤
│ VIN │ Jenis    │ Verdict  │ Findings  │ Waktu    │ Review   │
│ ... │ Visual   │ FAIL     │ 3 defects │ 10:32    │ Pending  │
│ ... │ Funct.   │ PASS     │ 0 issues  │ 09:15    │ Done     │
└─────┴──────────┴──────────┴───────────┴──────────┴──────────┘
```

### Checklist

**KPI Inspeksi:**
- [ ] Fetch `GET /api/v1/inspection/kpis`
- [ ] Tampilkan: First-pass yield (%), Review share (%), Failure count per periode
- [ ] KPI cards dengan trend indicator jika tersedia

**Filter Queue:**
- [ ] Fetch `GET /api/v1/inspection/results` dengan filter `kind`, `verdict`, `vin`, periode
- [ ] Semua filter tersimpan di URL search params
- [ ] Verdict badge: PASS (hijau), REVIEW (amber), FAIL (merah)
- [ ] Review status badge: Pending (amber), Done (hijau)

**Tabel:**
- [ ] Kolom: VIN, Jenis Inspeksi, Verdict, Jumlah Finding/Failed Check, Waktu, Status Review
- [ ] Pagination
- [ ] Klik baris → detail inspeksi

---

## Halaman 2: Detail Inspeksi Visual

**Route:** `/quality/inspections/{result_id}?kind=visual` atau melalui tab di `/cars/{vin}`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Quality > Inspections > VIN-001 Visual           │
├──────────────────────────────────────────────────────────────┤
│ Verdict: [FAIL] | VIN: VIN-001 | Waktu: 10:32               │
├──────────────────────────────────────────────────────────────┤
│ Tab: Finding per Body Zone                                   │
│ Zone: HOOD | Type: Scratch | Size: 15cm | Conf: 92%          │
│       Observation: Goresan panjang di sisi kiri kapot        │
│       [Evidence Image] atau [Media tidak tersedia]           │
│ Zone: DOOR_LEFT | ...                                        │
├──────────────────────────────────────────────────────────────┤
│ Build Sheet Mismatch: [jika ada]                             │
│   Expected: White | Found: Silver (Conf: 89%)               │
├──────────────────────────────────────────────────────────────┤
│ Form Review (hanya jika review_status = PENDING)             │
│ Keputusan: [Konfirmasi] [Eskalasi]                           │
│ Note (opsional): ___________                                 │
│ Actor: Fariss Bayu (supervisor) ← dari sesi, bukan input    │
│ [Submit Review]                                              │
└──────────────────────────────────────────────────────────────┘
```

### Checklist

**Fetch Data:**
- [ ] `GET /api/v1/cars/{vin}/inspection/visual`

**Tampilan Finding:**
- [ ] Verdict keseluruhan dengan badge warna
- [ ] Tabel/list per body zone: zone name, defect type, size, confidence, observation
- [ ] Evidence image via `GET /api/v1/media/{media_id}` — fallback jika unavailable/expired
- [ ] Build sheet mismatch: tampilkan expected vs found jika ada disagreement

**Form Review:**
- [ ] **Hanya tampil** jika `review_status === 'PENDING'`
- [ ] Setelah review selesai: tampilkan siapa yang review dan keputusannya
- [ ] Actor dari Zustand — tidak diketik manual
- [ ] Submit: `POST /api/v1/proposals/{proposal_id}/decide` atau endpoint review yang disepakati di Task 00
- [ ] UI **tidak dapat menyatakan PASS** tanpa hasil backend

---

## Halaman 3: Detail Inspeksi Functional

**Route:** `/quality/inspections/{result_id}?kind=functional`

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Quality > Inspections > VIN-001 Functional       │
├──────────────────────────────────────────────────────────────┤
│ Verdict: [REVIEW] | Waktu: 10:32                             │
├─────┬──────────────┬────────────┬────────────┬──────────────┤
│ Step│ Nama Check   │ Telemetry  │ Kamera     │ Conf │ Obs   │
│ 1   │ Brake test   │ ✓ 12.3 m  │ ✓ OK       │ 95%  │ -     │
│ 2   │ Light check  │ ✗ No data  │ ✓ PASS     │ 88%  │ ...   │ ← DISAGREE
│ 3   │ Horn test    │ ✓ 85 dB   │ ✓ OK       │ 91%  │ -     │
└─────┴──────────────┴────────────┴────────────┴──────────────┘
│ Clip Evidence per step (jika tersedia)                       │
├──────────────────────────────────────────────────────────────┤
│ Form Review (jika pending)                                   │
└──────────────────────────────────────────────────────────────┘
```

### Checklist

**Fetch Data:**
- [ ] `GET /api/v1/cars/{vin}/inspection/functional`

**Tampilan Checklist:**
- [ ] Tabel per step: step number, nama check, nilai telemetry, hasil kamera, confidence, observation
- [ ] Tandai disagreement antara telemetry dan kamera dengan **jelas** (icon warning + label "DISAGREE")
- [ ] Clip evidence per step via media API — fallback jika tidak tersedia

---

## Halaman 4: Reports & Rework (`/quality/rework`)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Reports & Rework                                             │
├──────────────────────────────────────────────────────────────┤
│ Filter: Verdict | Bay | Status Rework | VIN search           │
├──────────┬──────────┬────────────┬───────────┬──────────────┤
│ VIN      │ Verdict  │ Bay        │ Status    │ Updated      │
│ VIN-001  │ FAIL     │ Bay-A      │ IN_REPAIR │ 5 mnt lalu   │
│ VIN-002  │ REVIEW   │ Bay-B      │ DONE      │ 1 jam lalu   │
└──────────┴──────────┴────────────┴───────────┴──────────────┘
```

### Checklist

**Filter & Tabel:**
- [ ] Fetch `GET /api/v1/reports?verdict=&bay=`
- [ ] Filter: verdict, bay, status rework, VIN search — tersimpan di URL
- [ ] Kolom: VIN, Verdict, Bay, Status Repair, Status Reinspection, Updated
- [ ] Klik baris → detail report

**Panel Rework Bays:**
- [ ] Fetch `GET /api/v1/rework/bays`
- [ ] Tampilkan: Bay ID/name, availability (open/full), active work jika tersedia
- [ ] Badge capacity: hijau = open, amber = hampir penuh, merah = full

---

## Halaman 5: Detail Report (`/cars/{vin}/report`)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Cars > VIN-001 > Report                          │
├──────────────────────────────────────────────────────────────┤
│ Verdict: [FAIL] | VIN: VIN-001 | Confirmed by: Fariss (Sup) │
├──────────────────────────────────────────────────────────────┤
│ Visual Findings                                              │
│ - HOOD: Scratch 15cm (evidence available)                   │
├──────────────────────────────────────────────────────────────┤
│ Failed Functional Checks                                     │
│ - Light check: Telemetry vs Camera disagreement             │
├──────────────────────────────────────────────────────────────┤
│ Rework Tickets                                               │
│ Ticket #001 | Scratch repair | Bay-A | IN_REPAIR            │
│   [Mark Repair Done] ← hanya untuk worker                   │
├──────────────────────────────────────────────────────────────┤
│ Reinspection                                                 │
│ Status: WAITING / [hasil reinspeksi jika tersedia]           │
└──────────────────────────────────────────────────────────────┘
```

### Checklist

**Fetch Data:**
- [ ] `GET /api/v1/cars/{vin}/report`

**Tampilan:**
- [ ] Summary: VIN, verdict, siapa yang konfirmasi, kapan
- [ ] Visual findings dengan evidence links
- [ ] Functional failed checks
- [ ] Rework tickets: ID, jenis, bay, status repair
- [ ] Reinspection status: WAITING jika hasil baru belum tersedia — tidak boleh diasumsikan PASS

**Aksi Worker — Mark Repair Done:**
- [ ] Tombol **"Tandai Selesai"** hanya tampil jika:
  - Role user adalah `worker`
  - Ticket status bukan `DONE`
- [ ] `POST /api/v1/cars/{vin}/rework/done` dengan body `{ actor_id }` — dari Zustand
- [ ] Setelah sukses: tampilkan status menunggu reinspection

**Aksi Supervisor — Konfirmasi Rework:**
- [ ] Tombol **"Konfirmasi Rework"** / **"Clear"** sesuai proposal yang tersedia
- [ ] Hanya tampil untuk role `supervisor`
- [ ] Submit via proposal decision endpoint

---

## Komponen Bersama yang Dibuat di Task Ini

- [ ] `<InspectionVerdictBadge verdict />` — PASS/REVIEW/FAIL dengan warna + label
- [ ] `<FindingRow zone type size confidence observation />` — baris finding visual
- [ ] `<ChecklistRow step telemetry camera confidence disagree />` — baris functional dengan disagree indicator
- [ ] `<EvidenceViewer mediaId />` — viewer dengan fallback expired/unavailable (reuse dari Task 02)
- [ ] `<ReviewForm proposalId actorId onSuccess />` — form review yang hanya muncul saat pending
- [ ] `<ReworkTicketCard ticket onMarkDone />` — card tiket rework dengan aksi worker
- [ ] `<ReworkBayStatus bays />` — panel status bay

---

## Aturan Penting

1. **Form review hanya tampil saat `review_status === 'PENDING'`** — setelah selesai, tampilkan hasil
2. **UI tidak boleh menyatakan PASS** tanpa verdict dari backend
3. **Reinspection status WAITING** jika hasil baru belum tersedia — tidak diisi asumsi
4. **Media privat** selalu lewat `GET /api/v1/media/{id}` — fallback untuk expired
5. **Role guard**: worker hanya bisa mark done, supervisor yang bisa konfirmasi/reject rework

---

## Definition of Done

- [ ] Quality operator dapat membuka queue inspeksi dengan filter verdict/jenis/VIN
- [ ] Quality operator dapat membaca visual findings, evidence (atau fallback), dan build sheet mismatch
- [ ] Quality operator dapat membaca functional checklist dengan disagreement yang jelas
- [ ] Quality operator dapat submit review decision dari identity sesi — bukan manual
- [ ] Quality operator dapat menelusuri rework report lengkap per VIN
- [ ] Worker dapat menandai repair selesai (hanya jika role worker)
- [ ] Bay status rework dapat dilihat dengan jelas
- [ ] Semua filter tersimpan di URL
- [ ] UI tidak menyatakan verdict tanpa data dari backend

