# Task 01 — Scaffold, Shell, API Client & Mock Transport

## Tujuan

Membangun fondasi project: setup tooling, app shell dengan navigasi, API client bertipe, hook realtime SSE, dan mock transport (termasuk mock event bus & stream kamera) agar seluruh halaman dapat dikembangkan tanpa backend nyata.

## Techstack

| Kebutuhan | Pilihan |
|---|---|
| Runtime & package manager | **Bun** |
| UI framework | **React 19 + TypeScript** |
| Build tool | **Vite** (bundler via Bun) |
| Routing | **TanStack Router** (file-based routing) |
| Data fetching & cache | **TanStack Query** |
| Realtime Event Stream | **Browser native `EventSource` (SSE)** |
| Styling | **Tailwind CSS v4** |
| UI components | **shadcn/ui** |
| Schema validation | **Zod** (validasi response API) |
| State global | **Zustand** (session/auth state, event log buffer, camera state, mock mode) |

---

## Checklist

### 1. Inisialisasi Project

```bash
bun create vite@latest marshal-fe -- --template react-ts
cd marshal-fe
bun install
```

Setup wajib:
- [ ] Konfigurasi `tsconfig.json`: `strict: true`, path alias `@/` → `src/`
- [ ] Setup `biome` atau `eslint` + `prettier` untuk lint & format
- [ ] Setup Tailwind CSS v4 dengan PostCSS
- [ ] Setup shadcn/ui: `bunx shadcn@latest init`
- [ ] Install TanStack Router: `bun add @tanstack/react-router`
- [ ] Install TanStack Query: `bun add @tanstack/react-query`
- [ ] Install Zustand: `bun add zustand`
- [ ] Install Zod: `bun add zod`
- [ ] Setup Vitest: `bun add -D vitest @testing-library/react @testing-library/user-event`

### 2. Design System & Tema

Style profesional manufaktur:
- [ ] Tentukan CSS variables untuk color tokens:
  - `--color-success` → hijau industrial (`#5ac27a` / emerald) untuk PASS/success
  - `--color-warning` → amber industrial (`#e0b341` / amber) untuk REVIEW/pending/warn
  - `--color-danger` → merah industrial (`#f2645a` / rose) untuk FAIL/blocked/error/bad
  - `--color-neutral` → slate/abu (`#8b9199`) untuk informasi netral
  - Background: dark industrial `#101215` / `#161a1f` (mengikuti palet control room `dashboard.py`)
  - Font: monospace untuk VIN/ID/time, sans-serif bersih untuk teks UI
- [ ] Tambahkan status badge component (`<StatusBadge status="PASS|FAIL|REVIEW|PENDING|BLOCKED" />`)
- [ ] Tambahkan flow badge component (`<FlowBadge flow={1..7} />`) untuk 7 alur kerja AI
- [ ] Respektif `prefers-reduced-motion` — nonaktifkan animasi jika preferensi user menghindarinya

### 3. Routing (TanStack Router)

Setup file-based routing dengan struktur:

```
src/routes/
├── __root.tsx          # App shell (sidebar + topbar)
├── index.tsx           # redirect → /overview
├── overview/
│   └── index.tsx       # Live CCTV + Realtime Flow Logs + KPI
├── yard/
│   └── index.tsx       # Kondisi yard, peta, trucks, zone
├── cars/
│   ├── index.tsx
│   └── $vin.tsx        # /cars/:vin
├── actions/
│   └── index.tsx
├── assistance/
│   ├── index.tsx
│   └── $case_id.tsx
├── quality/
│   ├── inspections/
│   │   └── index.tsx
│   └── rework/
│       └── index.tsx
└── lab/
    └── index.tsx       # dengan tab internal: requests, scenarios, releases
```

- [ ] Setup TanStack Router dengan `createRouter` dan `RouterProvider`
- [ ] Tambahkan `<NotFoundRoute />` untuk unknown route
- [ ] Filter/search params disimpan di URL menggunakan TanStack Router search params (bukan state lokal)

### 4. App Shell

File `__root.tsx` — layout wrapper semua halaman:

**Sidebar:**
- [ ] Item navigasi: Overview, Yard, Cars, Action Center, Assistance, Quality & Rework, Test Lab
- [ ] Test Lab memiliki sub-tab: Requests, Scenarios, Releases (ditangani di halaman lab)
- [ ] Active state highlight sesuai route aktif
- [ ] Collapsible pada layar sempit (mobile-friendly)

**Top Bar:**
- [ ] Nama service/plant (dari konfigurasi atau `GET /api/v1/me`)
- [ ] API connection badge: `connected | degraded | offline` (berdasarkan `/healthz` dan `/readyz`)
- [ ] Live SSE stream indicator: `live (green dot) | reconnecting (yellow) | offline (red)`
- [ ] Waktu data terakhir diperbarui (freshness indicator)
- [ ] Identitas operator: nama + role (dari session/Zustand)
- [ ] Badge "MOCK MODE" yang jelas jika mock transport aktif

**Global states:**
- [ ] Loading skeleton untuk halaman yang sedang load
- [ ] Error panel global untuk network/server error tak tertangani
- [ ] Offline state: banner saat koneksi terputus

### 5. API Client & Realtime Hook

Buat HTTP client dan SSE hook di `src/lib/`:

**API Client (`src/lib/api-client.ts`):**
- [ ] Base URL dari environment variable `VITE_API_BASE_URL`
- [ ] Attach credentials (cookie/Authorization header) dari Zustand auth store
- [ ] Timeout handling dengan `AbortController`
- [ ] Normalisasi error: parse HTTP error → typed error object (401, 403, 404, 409, 422, 503)
- [ ] Response validation dengan Zod schemas

**Realtime SSE Hook (`src/lib/use-event-stream.ts`):**
- [ ] Custom hook `useEventStream(url)` memanfaatkan native `EventSource`
- [ ] Auto-reconnect handling saat event stream error
- [ ] Dispatch event baru ke `useEventLogStore`

### 6. Mock Transport

Buat mock layer di `src/lib/mock/`:

```
src/lib/mock/
├── index.ts            # switch: real vs mock transport
├── event-simulator.ts  # generator simulasi event SSE 7 flow (interval timer)
├── camera-simulator.ts # placeholder gambar/canvas animasi untuk mock CCTV feed
├── fixtures/
│   ├── cars.ts         # fixture VIN konsisten
│   ├── yard.ts
│   ├── assistance.ts
│   ├── proposals.ts
│   ├── inspection.ts
│   ├── reports.ts
│   ├── lab.ts
│   └── jobs.ts
└── handlers/
    ├── yard.ts
    ├── cars.ts
    └── ...
```

Aturan mock:
- [ ] VIN yang sama harus konsisten muncul di yard, assistance, inspection, report, rework
- [ ] `event-simulator.ts` memancarkan batch dummy events berkala (misal: mobil jalan, gate scan, assistance request) untuk menguji panel real-time
- [ ] Sediakan skenario error deterministik: unauthorized, forbidden, conflict, 503, timeout
- [ ] Delay terkontrol (contoh: 300-800ms) untuk menguji loading state — **bukan** delay acak
- [ ] Mock mode diaktifkan via env var `VITE_MOCK_MODE=true`

### 7. Zustand Stores

- [ ] `useAuthStore`: session user (`actor_id`, `display_name`, `role`, `permissions`)
- [ ] `useAppStore`: mock mode flag, API connection status, last updated timestamp
- [ ] `useEventLogStore`:
  - Buffer array `events: FlowEvent[]` dengan batas maksimal 400 events (FIFO ring buffer)
  - `addEvents(newEvents: FlowEvent[])`
  - `activeFlowFilter: number | null` (filter log berdasarkan Flow 1..7)
  - `isPaused: boolean` (operator bisa pause scroll log saat menganalisis event tertentu)
- [ ] `useCameraStore`:
  - URL stream CCTV & snapshot
  - Connection status: `streaming | snapshot_fallback | error`
  - Tombol manual reconnect

---

## Definition of Done

- [ ] `bun run dev` berjalan tanpa error
- [ ] `bun run build` menghasilkan production bundle tanpa error TypeScript
- [ ] `bun run test` (Vitest) berjalan
- [ ] Semua halaman (route) dapat dibuka dengan mock transport — tidak ada service luar diperlukan
- [ ] Hook `useEventStream` dan mock event generator bekerja (log terupdate otomatis di state)
- [ ] Health/readiness terbaca dan ditampilkan di topbar
- [ ] Badge "MOCK MODE" terlihat jelas saat mock aktif
- [ ] Sidebar navigasi berfungsi dan responsive
