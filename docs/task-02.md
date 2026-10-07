# Task 02 — Overview, Yard & Cars

## Tujuan

Implementasi tiga halaman utama operasional: ringkasan shift & monitoring live (Overview), kondisi yard & kontrol operasional (Yard), dan daftar/detail mobil (Cars). Operator dapat memantau feed video live CCTV plant, membaca update log aliran AI secara real-time via SSE, menelusuri data mobil, dan menjalankan aksi yard.

## Techstack yang Digunakan

- **TanStack Query** — `useQuery` untuk fetch data snapshot/list, `useMutation` untuk aksi
- **TanStack Router** — search params untuk filter/pagination, navigasi detail
- **Native EventSource / SSE** — konsumsi event stream `/events` ke Zustand store
- **shadcn/ui** — Table, Card, Badge, Dialog, Skeleton, Alert, Switch, Tabs
- **Tailwind CSS** — layout control tower profesional (split-pane, dark theme manufaktur)
- **Zod** — validasi response shape dari setiap endpoint
- **Zustand** — session/auth guard, event log buffer, status stream kamera

---

## Halaman 1: Overview (`/overview`)

### Layout Control Tower

```
┌────────────────────────────────────────────────────────────────────────┐
│ [API Connected] [Plant 01] [Stream Live ●] [10:45:12 UTC] [Supervisor] │ ← Top bar
├────────────────────────────────────────────────────────────────────────┤
│ Kartu KPI: Mobil Aktif | Assistance Open | Proposal Pending | Lab Gate │
├────────────────────────────────────┬───────────────────────────────────┤
│ 📹 Plant CCTV / CARLA Stream       │ ⚡ Live Flow Activity Log (SSE)   │
│ [LIVE ●] [HD Stream] [Reload]      │ [Filter: All | F1 | F2 .. F7] [⏸]│
│                                    │ 10:45:01 [F3] VIN-001 entered gate│
│  <img src="/camera.mjpg" />        │ 10:44:58 [F1] VIN-002 speed 14km/h│
│                                    │ 10:44:50 [F2] VIN-003 asked help ⚠️│
│ Info: Town04 · 1280x720 · 20 FPS   │ 10:44:12 [F5] VIN-004 verdict PASS│
├────────────────────────────────────┴───────────────────────────────────┤
│ Kolom "Butuh Tindakan Segera"      │ Kolom "Operasi Yard & Exceptions" │
│ - Kasus Bantuan (Assistance Open)  │ - Mobil menunggu dispatch         │
│ - Proposal Re-plan / Rework        │ - Exceptions / blocked paths      │
├────────────────────────────────────┴───────────────────────────────────┤
│ Ringkasan Test Lab (Skenario gagal / pending approval release)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Checklist

#### 1. Panel CCTV Live Stream (`<PlantCameraFeed />`)
Mengacu pada implementasi `marshal-ai/carla_viewer.py` & `dashboard.py`:
- [ ] Render stream MJPEG native via tag `<img src="/camera.mjpg" alt="Plant camera stream" />` (atau `/api/v1/camera/stream`)
- [ ] Tombol toggle mode: **Stream Live (MJPEG)** vs **Snapshot (JPEG)** (berguna jika jaringan operator terbatas)
- [ ] Indikator status feed: `LIVE ●` (merah), `PAUSED` (abu-abu), `OFFLINE` (kuning/merah)
- [ ] Tombol reload/reconnect jika feed terputus
- [ ] Menampilkan metadata kamera jika tersedia dari endpoint status (nama map/plant, resolusi, estimasi FPS)
- [ ] Fallback error: jika kamera backend/CARLA mati (`503`), tampilkan panel *"CCTV Stream Unavailable"* dengan tombol coba lagi

#### 2. Panel Live Flow Activity Log (`<LiveActivityFeed />`)
Mengacu pada implementasi `marshal-ai/dashboard.py` (`EventLog` -> `/events`):
- [ ] Mengonsumsi stream SSE via hook `useEventStream('/api/v1/events')` yang tersimpan di `useEventLogStore`
- [ ] Filter tab/pill berdasarkan alur kerja:
  - `All Flows`
  - `F1: Yard` (pergerakan & status misi)
  - `F2: Assistance` (permintaan bantuan darurat)
  - `F3: Visual Gate` (kamera gerbang inspeksi visual)
  - `F4: Functional Track` (uji trek & kamera)
  - `F5: Quality & Report` (verdict inspeksi & rework)
  - `F6: Scenario Lab` (permintaan uji baru)
  - `F7: Adversarial` (hasil uji regresi)
- [ ] Format baris log:
  - Waktu tabular `HH:MM:SS`
  - Flow ID badge (`<FlowBadge flow={1..7} />`)
  - Judul kejadian + warna level (`good`: hijau `#5ac27a`, `warn`: amber `#e0b341`, `bad`: merah `#f2645a`, `info`: netral)
  - Detail pesan kejadian
- [ ] Kontrol operator:
  - Tombol **Pause / Resume Auto-scroll** agar operator bisa membaca log tanpa tergeser saat event baru masuk
  - Tombol **Clear Feed** untuk membersihkan tampilan lokal
  - Counter jumlah event aktif (maksimal 400 event dalam memori buffer)

#### 3. Kartu KPI Operasional
- [ ] Fetch dari `GET /api/v1/kpis` dan `GET /api/v1/overview`
- [ ] Tampilkan: mobil per status penting, assistance open, proposal pending, release gate status
- [ ] Skeleton loading saat initial fetch, error state dengan tombol retry

#### 4. Butuh Tindakan vs Operasi Yard
- [ ] Kolom Butuh Tindakan: daftar kasus assistance open (`open=true`) dan proposal pending
- [ ] Kolom Operasi Yard: mobil yang berstatus exception atau tertahan (held)
- [ ] Klik item langsung menavigasi ke halaman detail terkait dengan query/filter tepat

#### 5. Polling & Resiliensi Data
- [ ] State REST tetap dipoll secara berkala (5 detik untuk queue aktif) sebagai backstop jaminan sinkronisasi jika koneksi SSE sempat terputus
- [ ] Polling otomatis berhenti saat tab browser tersembunyi (`document.visibilityState === 'hidden'`)

---

## Halaman 2: Yard (`/yard`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│ Ringkasan: Total mobil | Exception | Zone closed     │
├──────────────────────────────────┬──────────────────┤
│ Tabel Mobil                      │ Panel Truck       │
│ [Filter status | lokasi | flags] │ Truck ID          │
│ VIN | Status | Lokasi | Mission  │ ETA / Schedule    │
│ Truck | Slot | Flags | Updated   │ Delay indicator   │
│                                  │ Daftar mobil      │
├──────────────────────────────────┴──────────────────┤
│ Zone Closures | Rework Bays | [CCTV Mini Preview]   │
└─────────────────────────────────────────────────────┘
```

### Checklist

**Data & Tampilan:**
- [ ] Fetch `GET /api/v1/yard` untuk status mobil, trucks, zone closures, bays, exceptions
- [ ] Peta yard: jika API memberikan koordinat, render skema titik/jalur; jika hanya teks, tampilkan daftar titik rute
- [ ] **CCTV Mini Preview (Opsional / Floating):** tombol toggle untuk melihat jendela kecil feed CCTV gerbang saat operator mengawasi arus masuk mobil di yard

**Tabel Mobil & Filter:**
- [ ] Kolom: VIN, Status Badge, Lokasi, Mission, Truck, Slot, Flags, Updated
- [ ] Filter: status, lokasi, flags — tersimpan di URL search params
- [ ] Klik baris → navigasi ke `/cars/{vin}`

**Panel Truck:**
- [ ] Truck ID, ETA aktual, scheduled ETA, delay indicator, daftar mobil untuk truck tersebut

**Aksi Yard (Konfirmasi Wajib):**

| Aksi | Endpoint | Form / Dialog |
|---|---|---|
| Update ETA truck | `POST /api/v1/trucks/{truck_id}/eta` | Input ETA baru + alasan |
| Load truck | `POST /api/v1/trucks/{truck_id}/load` | Konfirmasi muatan VIN |
| Tutup/buka zone | `POST /api/v1/zones/{zone}/closure` | Konfirmasi status zone |
| Send mission | `POST /api/v1/cars/{vin}/missions` | Tujuan + alasan |
| Hold mobil | `POST /api/v1/cars/{vin}/hold` | Alasan + durasi |
| Resume mobil | `POST /api/v1/cars/{vin}/resume` | Konfirmasi lanjut jalan |

- [ ] Disable tombol saat mutasi pending (cegah double submit)
- [ ] Penanganan konflik `409 Conflict`: beri pesan jelas dan tombol refresh data

---

## Halaman 3: Cars List (`/cars`) & Detail (`/cars/{vin}`)

### Checklist

**Daftar Mobil (`/cars`):**
- [ ] Pencarian VIN, filter status, lokasi, truck, flags via URL search params
- [ ] Tabel data dengan pagination server-side

**Detail Mobil (`/cars/{vin}`):**
- [ ] Ringkasan VIN, build sheet, status, lokasi, mission, truck, slot, flags, timestamps
- [ ] Tab **Inspeksi Visual**: verdict, temuan per zone bodi, foto bukti kamera gerbang
- [ ] Tab **Functional Checklist**: checklist langkah uji, telemetri sensor vs rekaman kamera
- [ ] Tab **Laporan & Rework**: status tiket perbaikan dan bay
- [ ] Aksi kontekstual mobil (Hold / Resume / Kirim Misi) sesuai state aktif

---

## Komponen Bersama yang Dibuat di Task Ini

- [ ] `<PlantCameraFeed streamUrl snapshotUrl />` — panel streaming video MJPEG CCTV + fallback snapshot
- [ ] `<LiveActivityFeed />` — panel streaming log 7 flow SSE dengan auto-scroll dan filter flow
- [ ] `<FlowBadge flow={1..7} />` — label badge warna penanda flow AI
- [ ] `<KpiCard label value unit trend />` — kartu metrik KPI industri
- [ ] `<VehicleStatusBadge status />` — badge status mobil
- [ ] `<DataTable columns data pagination />` — tabel data dengan search dan sorting
- [ ] `<ConfirmActionDialog />` — dialog konfirmasi untuk aksi pergerakan yard

---

## Definition of Done

- [ ] Panel CCTV live stream dapat menampilkan feed kamera (atau mock simulator jika di dev mode)
- [ ] Panel Live Activity Feed menampilkan log real-time dari SSE dengan indikator level yang sesuai
- [ ] Operator dapat memfilter log berdasarkan Flow 1..7 dan men-toggle pause scroll
- [ ] Overview menampilkan KPI dan daftar aksi mendesak secara sinkron
- [ ] Operator dapat menelusuri data Yard dan mengeksekusi aksi operasional melalui konfirmasi aman
- [ ] Detail mobil menampilkan semua tab inspeksi dan data telemetri
- [ ] Polling dan stream terkelola dengan baik (hemat resource saat tab browser di-minimize)
