# Task 00 — Kontrak API, Identity & Keputusan Arsitektur

## Tujuan

Menetapkan kontrak yang disepakati sebelum kode frontend ditulis, termasuk integrasi live streaming kamera (CCTV/CARLA viewer) dan event log streaming (SSE) yang disediakan oleh sistem backend/AI `marshal-ai`.

## Techstack Resmi Project

- **Runtime & Package Manager**: **Bun**
- **UI Framework**: **React + TypeScript + Vite**
- **Routing**: **TanStack Router** (file-based routing, type-safe search params)
- **Server State & Data Fetching**: **TanStack Query**
- **Styling**: **Tailwind CSS** (Tema: Profesional Manufaktur / Dark Control Tower)
- **UI Components**: **shadcn/ui**
- **Schema Validation**: **Zod** (validasi kontrak API & runtime schema)
- **Global Client State**: **Zustand** (autentikasi actor, buffer live SSE log, preferensi kamera)
- **Testing**: **Vitest + RTL**, **Playwright**

---

## Checklist

### 1. Pemetaan API Routes

Petakan semua endpoint dari katalog API ke kontrak konkret. Untuk setiap endpoint tentukan:

- **Method + path** (contoh: `GET /api/v1/yard`)
- **Query parameters** yang diizinkan (filter, pagination, sort)
- **Request body schema** (untuk POST/PUT)
- **Response body schema** (shape minimum yang harus ada di UI)
- **HTTP error codes** dan makna spesifiknya per endpoint

Endpoint yang harus dipetakan:

| Grup | Endpoint | Deskripsi |
|---|---|---|
| Health & Identity | `/healthz`, `/readyz`, `/api/v1/me`, `/api/v1/overview`, `/api/v1/kpis` | Liveness, readiness, actor session, snapshot dashboard |
| CCTV & Monitoring | `/api/v1/camera/stream` (atau `/camera.mjpg`), `/api/v1/camera/snapshot` (atau `/snapshot.jpg`) | Live MJPEG camera feed & snapshot JPEG dari CCTV/CARLA |
| Realtime Logs | `/api/v1/events` | Server-Sent Events (SSE) live flow activity logs (Flow 1-7) |
| Yard & Cars | `/api/v1/yard`, `/api/v1/cars`, `/api/v1/cars/{vin}`, `/api/v1/map`, actions (truck/zone/mission/hold/resume/load) | State yard, detail kendaraan, aksi operasional |
| Proposals | `/api/v1/proposals`, `/api/v1/proposals/{id}/decide` | Antrean keputusan re-plan, rework, review |
| Assistance | `/api/v1/assistance/cases`, `/api/v1/assistance/cases/{id}`, `/api/v1/assistance/kpis`, decide | Kasus darurat keselamatan |
| Inspection & Rework | visual, functional, reports, rework bays, rework done | Hasil inspeksi gate & track, perbaikan |
| Test Lab | test-requests, scenarios, scenario review, adversarial-search, releases, evaluate, approve | Siklus pengujian skenario dan release gate |
| Jobs & Media | `/api/v1/jobs/{job_id}`, `/api/v1/media/{media_id}` | Polling job panjang, akses asset gambar/klip rekaman |

### 2. CCTV Live Stream & Media Contract

Mengacu pada arsitektur `marshal-ai` (`carla_viewer.py` & `dashboard.py`):

- [ ] **Live Video Stream (MJPEG):**
  - Endpoint: `GET /camera.mjpg` (atau via reverse proxy `/api/v1/camera/stream`)
  - Content-Type: `multipart/x-mixed-replace; boundary=carla-frame` (atau `image/jpeg` chunked)
  - Browser merender secara native menggunakan tag `<img src="..." />` tanpa perlu player video berat (WebRTC/HLS tidak diperlukan).
- [ ] **Snapshot Fallback:**
  - Endpoint: `GET /snapshot.jpg` (atau `/api/v1/camera/snapshot`)
  - Digunakan untuk fallback jika koneksi lambat, mobile preview, atau mode hemat bandwidth.
- [ ] **Penanganan Offline / Unavailable:**
  - Jika upstream kamera mati/unreachable (`503 Service Unavailable`): UI menampilkan state placeholder *"CCTV Feed Unavailable"* dan tombol Reconnect otomatis dengan backoff.
- [ ] **Static Media & Clips:**
  - `GET /api/v1/media/{media_id}` untuk bukti rekaman inspeksi / foto insiden. Tidak mengakses cloud storage privat secara langsung.

### 3. Realtime Event Log Stream (SSE) Contract

Mengacu pada implementasi `marshal-ai` (`dashboard.py` -> `EventLog`):

- [ ] **Endpoint:** `GET /events` (atau `/api/v1/events`)
- [ ] **Content-Type:** `text/event-stream` dengan keep-alive comment (`: keep-alive`)
- [ ] **Skema Data Event:**
  ```typescript
  interface FlowEvent {
    seq: number;          // Sequence counter (misal: 1, 2, 3...)
    at: string;           // Timestamp UTC (HH:MM:SS)
    flow: number;         // 1..7 (ID alur kerja)
    source: string;       // Nama modul/topik pengirim
    title: string;        // Ringkasan judul aksi/kejadian
    detail: string;       // Keterangan detail
    level: 'info' | 'good' | 'warn' | 'bad'; // Severity level
  }
  ```
- [ ] **7 Alur Kerja (Flows) yang dipantau:**
  1. `Yard traffic`: status pergerakan mobil, kecepatan, rute, mission arrival
  2. `Assistance desk`: permintaan bantuan darurat, rekomendasi AI, opsi
  3. `Visual inspector`: kendaraan masuk gerbang kamera CCTV gate, visual findings
  4. `Functional check`: langkah uji track & kamera
  5. `Report and rework`: penerbitan verdict PASS/FAIL, alokasi bay rework
  6. `Scenario generator`: permintaan uji baru, konversi skenario
  7. `Adversarial tester`: eksekusi uji adversarial, failing variant, regresi
- [ ] **Koneksi & Recovery:**
  - Menggunakan browser native `EventSource`.
  - Jika terputus (`onerror`), UI menampilkan badge *"Event stream reconnecting..."* dan melakukan auto-reconnect.
  - State polling (`GET /state` atau `/overview`) tetap berjalan sebagai jaminan data sinkron.

### 4. Authentication & Identity

- [ ] Tentukan authentication provider (JWT, session cookie, atau dev header)
- [ ] Tentukan bagaimana `actor_id` dan `role` diperoleh dari sesi (bukan diketik manual)
- [ ] Catat field dari `GET /api/v1/me`: `actor_id`, `display_name`, `role`, `permissions[]`
- [ ] Tentukan role yang diizinkan: `supervisor`, `inspector`, `worker`, `engineer`
- [ ] Dokumentasikan permission per aksi (misal: hanya `supervisor` yang boleh submit assistance decision)
- [ ] Batasi actor switcher hanya pada mode development (tidak boleh ada di production build)

### 5. Pagination, Filter & Job Lifecycle

- [ ] Tentukan convention pagination (`page`/`limit`) dan simpan filter di URL query params
- [ ] Dokumentasikan status job panjang: `queued → running → done | failed | timeout`
- [ ] Tentukan polling interval untuk job: 3 detik saat aktif, berhenti saat terminal

### 6. Konfirmasi & Role Guard

- [ ] Dialog konfirmasi wajib untuk:
  - Assistance decision (memilih opsi + konfirmasi)
  - Approve/reject proposal re-plan
  - Approve release (hanya setelah gate lulus)
  - Load truck & Zone closure
- [ ] Aksi di-guard oleh role yang sesuai di UI dan divalidasi mutlak oleh backend

---

## Output / Definition of Done

- [ ] Kontrak API mencakup live camera stream (MJPEG) dan live event log (SSE)
- [ ] Skema `FlowEvent` dan 7 kategori flow terdefinisi jelas
- [ ] Keputusan auth, identity, dan guard role terdokumentasi
- [ ] Mock transport siap menyimulasikan baik data REST, stream kamera dummy, maupun stream SSE
- [ ] Tim frontend dan backend menyepakati kontrak sebelum implementasi dimulai
