# Task 05 — Test Lab & Release Gate

## Tujuan

Implementasi halaman Test Lab untuk alur kerja engineer: membuat skenario dari deskripsi alami, memantau job, mereview skenario, menjalankan adversarial search, mengevaluasi release, dan menyetujui release hanya jika gate lulus. Approval tidak boleh tersedia jika evaluasi belum selesai atau gate gagal.

## Techstack yang Digunakan

- **TanStack Query** — `useQuery` (list/detail), `useMutation` (submit, review, evaluate, approve), polling job
- **TanStack Router** — route `/lab` dengan tab internal via search params
- **shadcn/ui** — Tabs, Textarea, Badge, Dialog, Skeleton, Progress, Table, Alert
- **Zod** — validasi shape response scenarios, jobs, releases
- **Zustand** — `useAuthStore` untuk `actor_id` dan role guard (hanya `engineer`)

---

## Halaman: Test Lab (`/lab`)

Tab internal dikelola via URL search param `?tab=requests|scenarios|releases`.

---

## Tab 1: Requests

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Test Lab                     [Requests] [Scenarios] [Releases]│
├──────────────────────────────────────────────────────────────┤
│ Form: Generate Scenario                                      │
│ Deskripsi situasi: ________________________________          │
│ Source: [Dropdown: assistance case | manual input]           │
│ [Generate Scenario →] ← submit async, tidak block halaman   │
├──────────────────────────────────────────────────────────────┤
│ Daftar Test Requests                                         │
│ ID | Source | Deskripsi | Waktu | Status (converted/pending) │
└──────────────────────────────────────────────────────────────┘
```

### Checklist

**Daftar Requests:**
- [ ] Fetch `GET /api/v1/lab/test-requests`
- [ ] Kolom: Request ID, Source (case ID atau manual), Deskripsi singkat, Waktu, Status konversi
- [ ] Status badge: `new` (abu), `processing` (amber + spinner), `converted` (hijau), `failed` (merah)
- [ ] Klik request yang sudah converted → navigasi ke scenario terkait di tab Scenarios

**Form Generate Scenario:**
- [ ] Field deskripsi situasi (Textarea — bahasa alami)
- [ ] Field source: dropdown (assistance case ID atau manual)
- [ ] Submit → `POST /api/v1/lab/scenarios` dengan body `{ situation, source }`
- [ ] Response berisi `job_id` → mulai polling job
- [ ] Submit tidak memblokir halaman (tombol bisa diklik kembali untuk request baru)
- [ ] Tampilkan notifikasi inline: "Job #{job_id} sedang berjalan..."
- [ ] Setelah job selesai: tampilkan link ke scenario yang dihasilkan

---

## Tab 2: Scenarios

### Layout — List

```
┌──────────────────────────────────────────────────────────────┐
│ Filter: Status [all|pending_review|approved|rejected] | Tags  │
├──────┬─────────┬────────────────┬──────┬──────────┬─────────┤
│ ID   │ Source  │ Status         │ Tags │ Owner    │ Waktu   │
│ S001 │ case-01 │ pending_review │ edge │ fariss   │ 10:32   │
│ S002 │ manual  │ approved       │ -    │ andi     │ 09:15   │
└──────┴─────────┴────────────────┴──────┴──────────┴─────────┘
```

### Checklist — List

- [ ] Fetch `GET /api/v1/lab/scenarios` dengan filter status, tags, pagination
- [ ] Filter tersimpan di URL search params
- [ ] Status badge: `draft`, `dry_run_running` (amber), `pending_review` (amber), `approved` (hijau), `rejected` (merah), `runnable` (biru)
- [ ] Klik baris → detail scenario

### Layout — Detail Scenario

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Lab > Scenarios > S001                           │
├──────────────────────────────────────────────────────────────┤
│ Status: [PENDING_REVIEW] | Source: case-01 | Owner: fariss   │
├──────────────────────────────────────────────────────────────┤
│ Spec (read-only, terformat)                                  │
│ { ... JSON/YAML spec skenario ... }                          │
├──────────────────────────────────────────────────────────────┤
│ Validator Notes / Errors                                     │
│ ✓ Schema valid                                               │
│ ⚠️ Warning: Waypoint jarak terlalu pendek                   │
├──────────────────────────────────────────────────────────────┤
│ Dry-run Metrics (jika tersedia)                              │
│ Distance: 42m | Steps: 15 | Collisions: 0                   │
├──────────────────────────────────────────────────────────────┤
│ [Jika PENDING_REVIEW dan role = engineer]                    │
│ Form Review:                                                 │
│ Keputusan: [Setujui] [Tolak]                                 │
│ Note: ___________                                            │
│ Actor: Fariss Bayu (engineer) ← dari sesi                   │
│ [Submit Review]                                              │
├──────────────────────────────────────────────────────────────┤
│ [Jika status = RUNNABLE/APPROVED]                            │
│ [Mulai Adversarial Search →]                                 │
└──────────────────────────────────────────────────────────────┘
```

### Checklist — Detail

**Fetch Data:**
- [ ] `GET /api/v1/lab/scenarios/{scenario_id}`

**Tampilan:**
- [ ] Spec read-only: tampilkan JSON/YAML terformat, bukan editable textarea
- [ ] Validator notes/errors: list dengan icon ✓/⚠️/✗
- [ ] Dry-run metrics: tabel atau card (jika tersedia dari response)
- [ ] Review status: siapa yang review, keputusan, dan note — tampil setelah review selesai

**Form Review:**
- [ ] Hanya tampil jika `status === 'pending_review'` **dan** role user adalah `engineer`
- [ ] Tombol: **"Setujui Skenario"** / **"Tolak Skenario"** — bukan tombol generik
- [ ] Note field (opsional)
- [ ] Submit: `POST /api/v1/lab/scenarios/{scenario_id}/review`
- [ ] Body: `{ decision: 'approved'|'rejected', actor_id, note }`
- [ ] Setelah sukses: invalidate scenario detail, tampilkan review record

**Adversarial Search:**
- [ ] Tombol hanya muncul jika scenario runnable (status `approved` atau `runnable`)
- [ ] Klik → `POST /api/v1/lab/scenarios/{scenario_id}/adversarial-search`
- [ ] Response: `job_id` → mulai job polling
- [ ] Tampilkan panel progress job (lihat komponen Job Status Panel)
- [ ] Setelah selesai, tampilkan:
  - Jumlah run
  - Robustness verdict
  - Failing variant terkecil (jika ada)
  - Criteria/metrics
  - Evidence dan report link (jika tersedia)

---

## Tab 3: Releases

### Layout — List

```
┌──────────────────────────────────────────────────────────────┐
│ Releases                                                     │
├───────┬────────────────┬──────────┬─────────────┬───────────┤
│ ID    │ Evaluasi Terkh │ Tests    │ Gate        │ Waktu     │
│ R1.0  │ PASSED (5/5)  │ 5 pass   │ APPROVED    │ kemarin   │
│ R1.1  │ FAILED (3/5)  │ 3 pass   │ BLOCKED     │ hari ini  │
└───────┴────────────────┴──────────┴─────────────┴───────────┘
```

### Checklist — List

- [ ] Fetch `GET /api/v1/lab/releases`
- [ ] Kolom: Release ID, Status evaluasi terakhir, Passed/Failed tests, Gate status, Waktu
- [ ] Badge gate: `approved` (hijau), `blocked` (merah), `pending` (abu)
- [ ] Klik baris → detail release

### Layout — Detail Release

```
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb: Lab > Releases > R1.1                            │
├──────────────────────────────────────────────────────────────┤
│ Status: [BLOCKED] | Evaluasi: FAILED (3/5)                   │
├──────────────────────────────────────────────────────────────┤
│ [Evaluate Release →] ← selalu tersedia (jika belum running)  │
├──────────────────────────────────────────────────────────────┤
│ Job Status: [running... / Selesai / Gagal]                   │
│ Progress: 3/5 scenarios complete                             │
├──────────────────────────────────────────────────────────────┤
│ Hasil Evaluasi (setelah job selesai)                         │
│ Test ID | Metric | Criteria | Result | Pass/Fail             │
│ T001    │ 12.3m  │ < 15m    │ PASS   │ ✓                    │
│ T002    │ 22.1m  │ < 15m    │ FAIL   │ ✗ ← tampilkan detail │
├──────────────────────────────────────────────────────────────┤
│ [Approve Release] ← hanya jika gate lulus dan role engineer  │
│ (disabled / hidden jika gate BLOCKED)                        │
└──────────────────────────────────────────────────────────────┘
```

### Checklist — Detail

**Fetch Data:**
- [ ] `GET /api/v1/lab/releases` atau endpoint detail release

**Tombol Evaluate Release:**
- [ ] `POST /api/v1/lab/releases/{release}/evaluate`
- [ ] Response: `job_id` → mulai polling `GET /api/v1/jobs/{job_id}`
- [ ] Disable tombol saat job sedang running
- [ ] Tampilkan progress job (jika tersedia dari response)

**Hasil Evaluasi:**
- [ ] Tabel: test ID, metric aktual, criteria target, result, PASS/FAIL
- [ ] Gagal: tampilkan metric vs criteria dengan highlight merah
- [ ] Evidence dan report link jika tersedia
- [ ] Setelah job done: invalidate release detail

**Tombol Approve Release:**
- [ ] **Hanya tampil** jika:
  1. Evaluasi terakhir selesai (`status === 'done'`)
  2. Gate lulus (semua test PASS)
  3. Backend mengizinkan (cek dari response)
  4. Role user adalah `engineer`
- [ ] `POST /api/v1/lab/releases/{release}/approve` dengan `{ actor_id }`
- [ ] Dialog konfirmasi wajib: "Anda akan menyetujui release R1.1. Lanjutkan?"
- [ ] Error jika backend gate tidak lulus: tampilkan alasan penolakan
- [ ] Error 409: release sudah diapprove atau evaluasi berubah

---

## Komponen Job Status Panel

Digunakan di Scenarios (adversarial search) dan Releases (evaluate):

```typescript
// <JobStatusPanel jobId onComplete />
```

### Checklist

- [ ] Polling `GET /api/v1/jobs/{job_id}` setiap 3 detik saat job `queued` atau `running`
- [ ] Hentikan polling saat job `done`, `failed`, atau tab tidak aktif
- [ ] Tampilkan status: `Queued`, `Running (progress%)`, `Done`, `Failed`
- [ ] Jika `failed`: tampilkan error message dari response
- [ ] Jika `done`: panggil callback `onComplete(result)`
- [ ] Handle job hilang setelah restart: tampilkan "Status tidak diketahui" — bukan error fatal
- [ ] Timeout: setelah 10 menit tanpa terminal state, tampilkan peringatan dengan tombol refresh manual

---

## Komponen Bersama yang Dibuat di Task Ini

- [ ] `<JobStatusPanel jobId onComplete />` — lihat spesifikasi di atas
- [ ] `<ScenarioCard scenario />` — card skenario dengan status dan aksi
- [ ] `<ScenarioSpec spec />` — spec read-only terformat (syntax highlight opsional)
- [ ] `<ValidatorNotes notes />` — list validator output dengan icon severity
- [ ] `<AdversarialResultPanel result />` — hasil adversarial search dengan metrics
- [ ] `<ReleaseEvalTable tests />` — tabel hasil evaluasi dengan PASS/FAIL highlight
- [ ] `<ApproveReleaseButton releaseId disabled reason />` — tombol dengan guard gate

---

## Aturan Penting

1. **Approve Release hanya muncul jika gate lulus** — tidak boleh ada bypass UI
2. **Actor ID selalu dari sesi** — tidak diketik manual
3. **Form review hanya untuk `engineer` role** — cek dari Zustand, konfirmasi di backend
4. **Job polling berhenti saat tab tidak aktif** dan saat job sudah terminal
5. **Submit form tidak block halaman** — engineer bisa buka request baru sambil job berjalan
6. **Spec skenario read-only** — tidak ada editing di frontend

---

## Definition of Done

- [ ] Engineer dapat mengisi form deskripsi → submit → melihat job berjalan → scenario terbuat
- [ ] Engineer dapat membuka daftar scenario dengan filter status
- [ ] Engineer dapat membaca spec, validator notes, dan dry-run metrics
- [ ] Engineer dapat approve/reject scenario pending review
- [ ] Engineer dapat memulai adversarial search dan melihat hasilnya
- [ ] Engineer dapat mengevaluasi release dan melihat hasil per test
- [ ] Tombol Approve Release hanya aktif jika gate lulus
- [ ] Job polling berjalan dan berhenti dengan benar
- [ ] Polling berhenti saat tab tidak aktif
- [ ] Role guard diterapkan: non-engineer tidak dapat approve scenario atau release

