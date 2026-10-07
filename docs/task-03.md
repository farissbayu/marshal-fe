# Task 03 — Action Center & Assistance

## Tujuan

Implementasi dua halaman keputusan manusia paling kritis: Action Center (antrean proposal re-plan, inspection review, rework) dan Assistance (kasus keselamatan mobil berhenti sampai manusia memilih). Keputusan harus eksplisit, dari actor terverifikasi, dan tidak boleh mengubah opsi yang ditawarkan backend.

## Techstack yang Digunakan

- **TanStack Query** — `useQuery` (list + detail), `useMutation` (submit decision), polling aktif
- **TanStack Router** — route `/actions`, `/assistance`, `/assistance/$case_id`
- **shadcn/ui** — Tabs, RadioGroup, Card, Dialog, Alert, Badge, Skeleton
- **Zod** — validasi response shape proposals dan assistance cases
- **Zustand** — `useAuthStore` untuk `actor_id` dan `role` (dikirim ke API, bukan diketik user)

> ⚠️ **Halaman ini adalah prioritas keselamatan.** Mobil berhenti sampai manusia memilih. UI tidak boleh memilih opsi secara default, membuat opsi baru, atau mengubah opsi dari backend.

---

## Halaman 1: Action Center (`/actions`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Action Center                                        │
├─────────────────────────────────────────────────────┤
│ [Tab: Re-plan] [Tab: Inspection Review] [Tab: Rework]│
├─────────────────────────────────────────────────────┤
│ Filter: status | VIN | kategori                      │
├─────────────────────────────────────────────────────┤
│ ID/VIN | Kategori | Ringkasan | Waktu Tunggu | Status│
│ [Buka Detail →]                                     │
└─────────────────────────────────────────────────────┘
```

### Checklist

**Tab Re-plan:**
- [ ] Fetch `GET /api/v1/proposals?kind=replan&status=pending`
- [ ] Tabel: Proposal ID, VIN, Kategori, Ringkasan, Waktu Menunggu, Status
- [ ] Badge waktu tunggu: semakin lama = makin merah (amber > 10 menit, merah > 30 menit)
- [ ] Klik baris → buka detail panel atau modal

**Tab Inspection Review:**
- [ ] Fetch `GET /api/v1/proposals?kind=inspection_review&status=pending`
- [ ] Atau fetch `GET /api/v1/inspection/results?review_status=pending`
- [ ] Tabel sesuai kontrak yang disepakati di Task 00

**Tab Rework:**
- [ ] Fetch `GET /api/v1/proposals?kind=rework&status=pending`
- [ ] Tabel: VIN, Bay, Jenis rework, Status, Waktu update

**Detail Proposal (slide-over panel atau halaman terpisah):**
- [ ] Tampilkan payload proposal lengkap
- [ ] Efek keputusan (apa yang terjadi jika disetujui vs ditolak) — jika tersedia dari API
- [ ] Opsi yang diizinkan: tampilkan hanya `allowed_actions` dari response
- [ ] Actor: ambil dari Zustand `useAuthStore().actor_id` — tidak diketik manual
- [ ] Tombol spesifik berdasarkan jenis proposal:
  - Re-plan: **Setujui Re-plan** / **Tolak Re-plan**
  - Inspection review: **Konfirmasi Review** / **Eskalasi**
  - Rework: **Konfirmasi Rework** / **Tolak Rework**
- [ ] **Bukan** tombol generik "Approve/Reject"

**Submit Decision:**
- [ ] `POST /api/v1/proposals/{proposal_id}/decide` dengan body `{ decision, actor_id }`
- [ ] Cegah double submit: disable tombol saat `isPending`
- [ ] Idempotency key jika API mendukung
- [ ] Setelah sukses: invalidate proposals list, tampilkan hasil keputusan
- [ ] Error 409 (conflict — proposal sudah diputuskan pihak lain): tampilkan pesan + tombol refresh
- [ ] Error 403: tampilkan "Anda tidak memiliki izin untuk aksi ini"

---

## Halaman 2: Assistance List (`/assistance`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Assistance Cases                    [Refresh]        │
├─────────────────────────────────────────────────────┤
│ Sort: urgensi | waktu open                           │
├─────────────────────────────────────────────────────┤
│ ⚠️ VIN-001 | Zona A | Orang terdeteksi dekat        │
│    Status: OPEN | Menunggu 4 menit | [Buka →]       │
│ ── VIN-002 | Zona B | Obstacle tidak teridentifikasi│
│    Status: ESCALATED | Menunggu 12 menit | [Buka →] │
└─────────────────────────────────────────────────────┘
```

### Checklist

**Daftar:**
- [ ] Fetch `GET /api/v1/assistance/cases?open=true`
- [ ] Urutkan: urgensi (ada orang/peralatan dekat di atas) → waktu menunggu (terlama di atas)
- [ ] Setiap baris: VIN, Lokasi, Situasi singkat, Status Eskalasi, Waktu Menunggu
- [ ] Indikator risiko khusus jika ada orang/peralatan bergerak: icon peringatan merah + label teks
- [ ] Polling 5 detik — hanya saat tab aktif
- [ ] Empty state: "Tidak ada assistance case terbuka"

**KPI Assistance:**
- [ ] Fetch `GET /api/v1/assistance/kpis`
- [ ] Tampilkan: Open count, Resolved count, Rata-rata latency

---

## Halaman 3: Assistance Detail (`/assistance/$case_id`)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Assistance > Case VIN-001-20241001               │
├────────────────────────────────┬─────────────────────────────┤
│ Info Case                      │ ⚠️ RISIKO: Orang dekat     │
│ VIN: VIN-001                   │ Indikator risiko + teks     │
│ Posisi: Zone A, Bay 3          ├─────────────────────────────┤
│ Waktu open: 4 mnt lalu         │ Rekomendasi AI              │
│ Situasi: Obstacle besar        │ Pilihan: BYPASS_LEFT        │
│ Status: OPEN                   │ Confidence: 87%             │
│                                │ [ini rekomendasi, bukan keputusan] │
├────────────────────────────────┴─────────────────────────────┤
│ Evidence (jika tersedia)                                     │
│ [Image placeholder jika media expired/unavailable]           │
├──────────────────────────────────────────────────────────────┤
│ Pilih Opsi (dari backend):                                   │
│ ○ BYPASS_LEFT  — Risiko: Rendah. Alasan: jalur kiri bersih  │
│ ○ BYPASS_RIGHT — Risiko: Sedang. Alasan: ada peralatan       │
│ ○ WAIT_OPERATOR — Risiko: Rendah. Mobil tetap berhenti      │
│                                                              │
│ [Submit Keputusan] ← aktif hanya setelah user memilih opsi  │
└──────────────────────────────────────────────────────────────┘
```

### Checklist

**Fetch Data:**
- [ ] `GET /api/v1/assistance/cases/{case_id}` — detail case
- [ ] Polling 5 detik selama case masih OPEN — hanya saat tab aktif

**Bagian Info Case:**
- [ ] VIN, posisi, waktu open, situasi, status case (OPEN/ESCALATED/RESOLVED)
- [ ] Tampilkan `resolved_by`, waktu, dan hasil jika case sudah selesai

**Bagian Risiko:**
- [ ] Jika ada indikator orang/peralatan bergerak: tampilkan banner/badge merah dengan teks jelas
- [ ] Indikator ini adalah konteks informasi, bukan tombol aksi

**Bagian Evidence:**
- [ ] Fetch via `GET /api/v1/media/{media_id}` menggunakan reference dari case detail
- [ ] Jika media unavailable/expired: tampilkan placeholder dengan pesan "Media tidak tersedia"
- [ ] **Tidak boleh mencoba membuka URL storage privat langsung dari browser**

**Bagian Rekomendasi AI:**
- [ ] Tampilkan pilihan yang direkomendasikan agent, confidence level
- [ ] Label jelas: "Ini adalah rekomendasi AI, bukan keputusan"
- [ ] **Tidak boleh di-pre-select sebagai default**

**Bagian Pilihan Opsi:**
- [ ] Render `RadioGroup` dengan opsi **persis** dari `options[]` di response API
- [ ] Setiap opsi: nama, deskripsi risiko, alasan ranking (jika tersedia)
- [ ] **Tidak boleh menambah, menghapus, atau mengubah opsi**
- [ ] Tombol submit `disabled` sampai user memilih satu opsi

**Submit Keputusan:**
- [ ] Klik submit → tampilkan dialog konfirmasi ringkas: "Anda memilih: {opsi}. Lanjutkan?"
- [ ] `POST /api/v1/assistance/cases/{case_id}/decide` dengan body `{ option, actor_id }` — `actor_id` dari Zustand, bukan input user
- [ ] Saat pending: disable semua tombol dan RadioGroup
- [ ] Setelah sukses: tampilkan pilihan yang dipilih, resolved_by, waktu, hasil
- [ ] Error: tampilkan pesan error spesifik + tombol retry

---

## Komponen Bersama yang Dibuat di Task Ini

- [ ] `<ProposalCard proposal onDecide />` — card proposal dengan tombol aksi spesifik
- [ ] `<AssistanceCaseRow case />` — baris list assistance dengan urgency indicator
- [ ] `<RiskIndicator level label />` — banner/badge risiko (orang dekat, peralatan bergerak)
- [ ] `<OptionRadioGroup options value onChange />` — radio group opsi dari backend
- [ ] `<DecisionResult decision resolvedBy timestamp />` — tampilan setelah keputusan disubmit
- [ ] `<ActorBadge actorId role />` — badge identitas actor dari sesi
- [ ] `<WaitingTimeBadge createdAt />` — waktu tunggu dengan color escalation

---

## Aturan Penting (Jangan Dilanggar)

1. **Actor ID selalu dari sesi** (`useAuthStore().actor_id`) — tidak pernah dari text field
2. **Opsi assistance hanya dari backend** — tidak ada hardcode, tidak ada opsi tambahan
3. **Rekomendasi AI tidak di-pre-select** — user harus memilih secara eksplisit
4. **Double submit dicegah** — tombol disabled saat `isPending`
5. **Konfirmasi wajib** sebelum submit keputusan assistance
6. **Media privat** tidak diakses langsung — selalu lewat `GET /api/v1/media/{id}`

---

## Definition of Done

- [ ] Operator dapat melihat antrean proposal per tab (re-plan, inspection review, rework)
- [ ] Operator dapat membaca detail proposal dan membuat keputusan dengan tombol spesifik
- [ ] Operator dapat membuka assistance list yang diurutkan berdasarkan urgensi
- [ ] Operator dapat membuka detail assistance case dan melihat evidence (atau fallback jika expired)
- [ ] Operator hanya dapat memilih dari opsi yang ditawarkan backend
- [ ] Rekomendasi AI ditampilkan sebagai konteks, bukan default selection
- [ ] Keputusan tersimpan atas actor dari sesi terverifikasi
- [ ] Error 409 (conflict) ditangani dengan refresh prompt
- [ ] Polling berhenti saat tab tidak aktif

