# Task 08 — Live Decision Feed: Keputusan Gemini (Rute & Parkir) di Dashboard

> Dokumen ini untuk sisi **marshal-fe**. Backend-nya sudah selesai di `marshal-ai` dan diteruskan
> oleh `marshal_api`; di sini dijelaskan kontrak event, alur data, konfigurasi, runbook, dan
> batasan integrasi yang sudah terpasang di halaman `/`.

## Tujuan

Menampilkan keputusan model di dashboard supervisor secara live, bukan angka contoh:

1. **Decision 1 — pilihan rute** (`route.choice`): jalan yang dipilih beserta probabilitas tiap
   jalan, dari logprob token jawaban Gemini (atau `by: "rules"` bila aturan yang memutuskan).
2. **Decision 2 — loop parkir** (`parking.step`): path yang ditawarkan planner, pilihan Gemini,
   dan probabilitasnya, satu baris per langkah parkir.

Kartu **Decision feed** di `/` kini membaca SSE (`/events`) melalui
`useEventStream` → `event-log` store, dan menampilkan 14 event terakhir secara terbalik (terbaru
di atas). Di mock mode feed tetap hidup lewat `event-simulator` sehingga halaman bisa didemokan
tanpa backend.

---

## 1. Alur End-to-End

```
marshal_ai (plant)               bus: vehicle-status               konsumen SSE              marshal-fe
──────────────────               ───────────────────               ────────────              ──────────
route.choose() selesai  ──────┐
  flows/route.py:138-158       │   dict per keputusan:
  (rules atau Gemini)          ├─▶ type/flow/source/title/detail/level
_note_decision()         ──────┘   + vin/choice/probs/by/...
  carla_backend.py:1162            + slot/decision/paths
  (per langkah parkir,                     │
   hanya CARLA +                           ├─▶ GET /api/v1/events ──▶ EventSource ──▶ parseEvents
   MARSHAL_PARKING=gemini)                 └─▶ GET :8090/events ────▶   (sama)    ──▶ event-log (400)
                                                                                     ──▶ DecisionFeed (/)
```

Poin kunci:

- Satu dict per keputusan dipublikasikan ke topik bus `vehicle-status` (`Topic.VEHICLE_STATUS`).
  Ia membawa **kunci generik** (`flow/source/title/detail/level`) supaya bisa dirender sebagai
  baris feed apa adanya, plus **kunci terstruktur** (`vin/choice/probs/...`) untuk klien yang
  ingin memproses pilihan.
- Ada **dua konsumen SSE** yang bentuk pesannya sedikit berbeda (lihat bagian 2.4):
  `marshal_api` (`/api/v1/events`) dan dashboard `marshal_ai` (`:8090/events`).
- FE punya satu `EventSource`; `parseEvents` menerima kedua bentuk.

---

## 2. Kontrak Event

### 2.1 `route.choice` — pilihan jalan

Dipublikasikan oleh `marshal_ai/flows/route.py:138-158` setiap `route.choose()` selesai
(`flows/route.py:176` untuk jalur rules, `:191` untuk jalur Gemini). Pemanggilnya adalah
`flows/yard.py:205-216` (`send_to_slot`, dipicu `flows/report.py:191` saat mobil lulus inspeksi
dan tick yard `flows/yard.py:457-466`).

Contoh — Gemini yang memutuskan (bentuk nyata dari eval, `eval/routes.py`):

```json
{
  "type": "route.choice", "flow": 1, "source": "route",
  "title": "VIN-P1 → via lane_c",
  "detail": "Gemini's choice · via lane_c 1.00, via finishing_corner 0.00 · 1.2 s",
  "level": "info",
  "vin": "VIN-P1", "choice": "via lane_c", "by": "gemini",
  "probs": { "via lane_c": 1.0, "via finishing_corner": 0.0 },
  "seconds": 1.2
}
```

Contoh — aturan yang memutuskan (tidak ada laporan di kedua jalan, Gemini tidak ditanya):

```json
{
  "type": "route.choice", "flow": 1, "source": "route",
  "title": "VIN-214 → via finishing_corner",
  "detail": "nothing reported on any way, so the shortest",
  "level": "info",
  "vin": "VIN-214", "choice": "via finishing_corner", "by": "rules",
  "probs": {}, "seconds": null
}
```

| Field | Arti |
|:--|:--|
| `by` | `"gemini"` bila model menjawab, `"rules"` bila aturan/fallback yang memilih |
| `probs` | probabilitas per label jalan (dibulatkan 3 desimal); kosong `{}` bila tidak ada panggilan model |
| `seconds` | waktu keputusan Gemini dalam detik; `null` untuk jalur rules |
| `detail` | kalimat siap-tampil untuk feed (alasan + daftar probabilitas + waktu) |

### 2.2 `parking.step` — satu langkah loop parkir

Dipublikasikan `marshal_ai/driving/carla_backend.py:1162` (`_note_decision`, dipanggil di `:1107`)
untuk setiap keputusan `session.apply` — hanya saat `MARSHAL_PARKING=gemini` dan bus di-inject di
`marshal_ai/runtime.py:139-142`.

```json
{
  "type": "parking.step", "flow": 1, "source": "parking",
  "title": "VIN-P1 parking yard.Y4: path_A (0.99)",
  "detail": "path_A 0.99, path_B 0.01, ask_a_person 0.00",
  "level": "good",
  "vin": "VIN-P1", "slot": "yard.Y4", "choice": "path_A",
  "probs": { "path_A": 0.99, "path_B": 0.01, "ask_a_person": 0.0 },
  "decision": 1,
  "paths": [ { "option": "path_A", "strategy": "forward only", "metres": 12.3 } ]
}
```

| Field | Arti |
|:--|:--|
| `choice` | `path_A…C`, `parked`, atau `ask_a_person` |
| `level` | `good` untuk `path_*`/`parked`; `warn` untuk `ask_a_person`/`gave_up` |
| `decision` | nomor langkah dalam sesi parkir (mulai 1) |
| `paths` | path yang ditawarkan planner ke Gemini (`option`, `strategy`, `metres`) |

### 2.3 Bentuk SSE dari `marshal_api`

`GET /api/v1/events` mengirim satu objek `FlowEvent` per pesan `data:` (`streaming/sse.py:70-102`,
`:157-169`). Field `data` diisi hanya untuk event keputusan (`_decision_data`) dan hanya memuat
kunci yang ada:

```json
{
  "seq": 412, "at": "2026-10-17T08:12:03.512Z",
  "flow": 1, "source": "route",
  "title": "VIN-P1 → via lane_c",
  "detail": "Gemini's choice · via lane_c 1.00, via finishing_corner 0.00 · 1.2 s",
  "level": "info",
  "data": { "vin": "VIN-P1", "choice": "via lane_c",
            "probs": { "via lane_c": 1.0, "via finishing_corner": 0.0 },
            "by": "gemini", "seconds": 1.2 }
}
```

### 2.4 Perbedaan dua sumber SSE

`parseEvents` di FE menangani keduanya, tetapi ada beda yang perlu diketahui saat men-debug:

| | `marshal_api` `/api/v1/events` | dashboard `marshal_ai` `:8090/events` |
|:--|:--|:--|
| Format pesan | satu objek JSON per pesan | array batch `[{...},{...}]` |
| `source` | dari payload (`route` / `parking`) | diganti nama flow ("Yard traffic") |
| `flow` | dari peta topic→flow (`vehicle-status` → 1) | dari event; baris sistem ber-`flow: 0` **dibuang** schema FE (`min(1)`) |
| Field `data` | ada (terstruktur) | tidak ada — hanya teks di `detail` |
| Unicode | apa adanya (`→`) | di-escape (`\u2192`) |
| Backfill saat connect | dari tabel `event_logs` + dukungan `Last-Event-ID` | 40 event terakhir dari memori dashboard |

---

## 3. Konfigurasi Frontend

| Variable | Contoh | Arti |
|:--|:--|:--|
| `VITE_EVENTS_URL` | `/events` | Sumber SSE flow event; default `{VITE_API_BASE_URL}/events` (`src/lib/env.ts:23-26`) |

- **Produksi / CARLA host:** biarkan default — FE menembak `marshal_api`, CORS sudah diatur
  (`marshal_api/main.py:41-47`).
- **Run lokal tanpa `marshal_api`:** set `VITE_EVENTS_URL=/events`; proxy dev di
  `vite.config.ts:22-27` meneruskan `/events` ke dashboard `marshal_ai` `127.0.0.1:8090`
  (server stdlib-nya tidak mengirim header CORS, jadi harus lewat proxy).
- **Mock mode** (`VITE_MOCK_MODE=true`, default dev): stream tidak menyentuh jaringan sama sekali,
  `event-simulator` mengisi feed.
- Reconnect otomatis 3 detik (`src/lib/use-event-stream.ts:62-67`); buffer store 400 event
  (`src/lib/stores/event-log.ts:4`).

---

## 4. Peta Titik Integrasi

**marshal-fe**

| Berkas | Peran |
|:--|:--|
| `src/lib/env.ts:23-26` | `EVENTS_URL` + override `VITE_EVENTS_URL` |
| `src/lib/use-event-stream.ts:12` | hook `useEventStream` (mock mode di `:25-37`) |
| `src/lib/use-event-stream.ts:46-60` | `EventSource` + `onmessage` → `parseEvents` |
| `src/lib/use-event-stream.ts:82-93` | `parseEvents`: objek tunggal **atau** array, Zod-validated, item rusak dibuang |
| `src/lib/schemas.ts:63-74` | `flowEventSchema` (+ field `data` di `:72`) |
| `src/lib/feed-rows.ts` | mapping event → baris feed: waktu, tone per `level`, 14 terbaru, dan `data.probs` terstruktur |
| `src/routes/index.tsx:123` | `useEventStream()` dipanggil halaman `/` |
| `src/routes/index.tsx:369-422` | DecisionFeed: baris `data-testid="feed-row"`, pill probabilitas, empty state di `:391-395` |
| `vite.config.ts:22-27` | proxy dev `/events` → `127.0.0.1:8090` |
| `src/lib/use-event-stream.test.ts` | tes parser: objek tunggal, array, item rusak, payload `data` |
| `src/lib/feed-rows.test.ts` | tes baris feed: urutan, cap, format waktu, pill probabilitas |
| `e2e/decision-feed.spec.ts` | Playwright: feed menampilkan event live (mock mode) |

**Backend (referensi, tidak diubah dari sisi FE)**

| Berkas | Peran |
|:--|:--|
| `marshal_ai/flows/route.py:138-158, 176, 191` | publish `route.choice` |
| `marshal_ai/driving/parking.py:419` | `step_event()` — payload `parking.step` bersama untuk CARLA & eval |
| `marshal_ai/driving/carla_backend.py:1107, 1172-1184` | publish `parking.step` (memakai `step_event`) |
| `marshal_ai/runtime.py:139-142` | inject bus ke backend saat `MARSHAL_PARKING=gemini` |
| `marshal_ai/eval/parking.py:120, 248, 272-285` | `--publish`: loop parkir tanpa CARLA ikut mengirim event |
| `marshal_ai/dashboard.py:114-176` | `describe()` untuk kedua tipe; `:179-182` anti-dedup |
| `marshal_api/schemas/common.py:150` | `FlowEvent.data` |
| `marshal_api/streaming/sse.py:70-76, 92, 102, 157-169` | `_decision_data` + endpoint SSE |
| `marshal_api/plant.py` + `marshal_api/main.py` (lifespan) | plant in-process (`MARSHAL_RUN_PLANT=1`) di bus API — keputusan live tanpa CARLA |
| `marshal_api/api/v1/plant.py` | channel kontrol tombol dashboard (spawn/exception/decide/restart) |
| `marshal_ai/events/bus.py` + `marshal_ai/app.py:close()` | unsubscribe — restart plant melepas handler app lama |
| `marshal-fe/src/lib/use-plant.ts` + `src/lib/mock/handlers/plant.ts` | hook polling 2 s + handler mock setara |
| `marshal_api/config.py` (`run_plant`, `plant_speed`) | flag plant lokal |

---

## 5. Cara Menjalankan

### 5.1 Dua service: `marshal_api` (+ plant in-process) dan `marshal-fe`

FE selalu menembak `marshal_api` lewat default `{VITE_API_BASE_URL}/events` — tidak perlu
`VITE_EVENTS_URL`. Karena plant CARLA tidak jalan di laptop, `marshal_api` bisa menjalankan plant
yang sama di prosesnya sendiri (`MARSHAL_RUN_PLANT=1`, lihat `marshal_api/plant.py`): bus bersama,
jadi `/api/v1/events` membawa keputusan live.

```bash
# dari root repo — kedua service sekaligus (Ctrl-C mematikan keduanya)
make dev

# terpisah bila perlu:
make api        # API + plant in-process (marshal-ai/.env.development)
make fe         # FE saja
make api-prod   # API dengan marshal-ai/.env.production
```

Setara manualnya:

```bash
# Terminal 1 — API + plant in-process (Gemini hanya untuk keputusan rute; media offline)
cd marshal-ai
MARSHAL_RUN_PLANT=1 MARSHAL_PLANT_SPEED=8 MARSHAL_LLM=gemini MARSHAL_ROUTE=always \
MARSHAL_STORE=memory MARSHAL_BUS=memory GOOGLE_CLOUD_LOCATION=asia-southeast1 \
.venv/bin/python -m uvicorn marshal_api.main:app --port 8000

# Terminal 2 — FE
cd marshal-fe
bun run dev        # http://localhost:5173, feed dari /api/v1/events
```

Catatan:

- `MARSHAL_LLM=gemini` + plant runner memakai `RoutedLLM`: hanya `route.*` yang ke Gemini
  (panggilan teks murni). Penilaian media (gate/track) tetap offline karena gambarnya hanya
  resolve di GCS pada host — dengan Gemini penuh di laptop, Vertex menjawab 403.
- `MARSHAL_ROUTE=reason` (default produksi) hanya bertanya bila ada kejadian; `always` membuat
  setiap dispatch jadi keputusan Gemini — di feed muncul pill probabilitas.
- Plant lokal hidup terus: mobil baru masuk line saat antrian lengang (maks 4 di jalan) dan truk
  demo berangkat setiap 8 menit simulasi, jadi slot yard tidak penuh dan keputusan terus muncul.
- Decision feed menyembunyikan telemetri (status mobil biasa dan langkah track per-langkah); yang
  tampil: keputusan rute (dengan probabilitas), verdict inspeksi, dan kedatangan.
- Tanpa kredensial Gemini: `MARSHAL_LLM=offline` (feed tetap jalan, `by: "rules"`).
- `parking.step` tidak muncul di jalur ini (plant fake memakai stand-in parkir).
- Alternatif tanpa menu plant di API: dashboard `marshal_ai` (`python -m marshal_ai.dashboard
  --seed-demo --run-plant`, `:8090`) lalu FE dengan `VITE_EVENTS_URL=/events` (proxy dev) — hanya
  untuk demo cepat; jalur `marshal_api` di atas yang benar.

### 5.2 Host CARLA (routing + parkir live, lewat `marshal_api`)

```bash
# Host CARLA
MARSHAL_PARKING=gemini bash scripts/run_carla_plant.sh     # sudah menyetel Gemini + region

# marshal_api (bisa di mesin lain, live mode)
MARSHAL_STORE=gcp MARSHAL_BUS=gcp uvicorn marshal_api.main:app --port 8000

# marshal-fe — default (VITE_EVENTS_URL tidak diset) → /api/v1/events
bun run dev
```

### 5.3 Mock mode (tanpa backend, untuk Cloudflare/demo)

```bash
cd marshal-fe && bun run dev     # VITE_MOCK_MODE=true → event simulator
```

### Cek cepat stream

```bash
curl -N http://127.0.0.1:8090/events          # batch array (dashboard)
curl -N http://127.0.0.1:8000/api/v1/events   # satu objek per pesan + field data (API)
```

---

## 6. Verifikasi yang Sudah Dijalankan

- **marshal-ai:** `pytest` → **497 passed, 2 gagal** — keduanya pra-eksisting/environmental dan
  tetap gagal tanpa perubahan integrasi ini: `test_carla_backend_parks_with_gemini_decisions`
  dan `test_no_path_while_a_neighbour_is_still_parking_waits_and_plans_again` (loop/pencarian
  berbatas waktu, sensitif beban mesin; bukan regresi dari event feed).
- **marshal-fe:** `bun run lint` hijau; `bunx tsc -b` OK; `bun run test` **33 passed** (9 berkas,
  termasuk tes parser dan `feedRows`); `bun run build` OK; `bunx playwright test` **2 passed**
  (layar supervisor + feed menampilkan event live).
- **Smoke SSE:** dashboard lokal mengeluarkan baris
  `VIN-214 → via finishing_corner` (`by rules`) baik langsung di `:8090` maupun lewat proxy Vite
  (`:5175/events`); `_live()` `marshal_api` mengembalikan `data.choice`/`data.probs` di jalur
  live (topic) maupun memory (topic-less).
- **Parkir offline → bus:** `python -m marshal_ai.eval.parking --policy planner --publish`
  mem-publish 4 event `parking.step` berisi `probs` lengkap; `step_event` + `describe()` diuji di
  `tests/test_parking.py`.
- **Plant in-process di API (jalur benar FE):** `MARSHAL_RUN_PLANT=1` + `MARSHAL_LLM=gemini` +
  `MARSHAL_ROUTE=always` → keputusan Gemini asli (`VIN-214/VIN-240 → via finishing_corner`,
  `"by":"gemini"`, ~1.5 s) muncul di `/api/v1/events` **dan** lewat proxy FE
  (`:5175/api/v1/events`) dengan `data.choice` + `data.probs`.
- **FE end-to-end (headless browser):** feed menampilkan baris keputusan asli
  `VIN-P43 → via finishing_corner — Gemini's choice · 0.99 / 0.01 · 0.49 s` lengkap dengan pill
  probabilitas, tanpa spam status/langkah track; segmen lama (`system/status` mentah) sudah hilang
  karena SSE sekarang memakai `describe()` + dedup status.

---

## 7. Checklist Tindak Lanjut

**Backend**
- [x] publish `route.choice` (`marshal_ai/flows/route.py`)
- [x] publish `parking.step` (`marshal_ai/driving/carla_backend.py` + `parking.step_event`)
- [x] wiring bus parkir (`marshal_ai/runtime.py`)
- [x] `describe()` + anti-dedup dashboard (`marshal_ai/dashboard.py`)
- [x] `FlowEvent.data` + `_decision_data` (`marshal_api`)
- [x] tes publish & describe (`tests/test_route_choice.py`, `tests/test_dashboard.py`)
- [x] loop parkir tanpa CARLA ikut mem-publish event (`eval/parking.py --publish`)

**Frontend**
- [x] `VITE_EVENTS_URL` + `EVENTS_URL` (`src/lib/env.ts`)
- [x] `parseEvents` tunggal/array + tes (`src/lib/use-event-stream.ts`)
- [x] DecisionFeed live + empty state (`src/routes/index.tsx`)
- [x] Pill probabilitas dari `data.probs` (`src/lib/feed-rows.ts` + tes)
- [x] e2e Playwright feed live (`e2e/decision-feed.spec.ts`)
- [x] proxy dev `/events` (`vite.config.ts`)
- [x] `bun run lint` hijau (format `src/lib/mock/handlers/assistance.ts` diperbaiki)
- [x] dokumentasi env (dokumen ini, README, `.env.example`)

**Sisa (belum dikerjakan)**
- [ ] Peta rute/waypoints dan bird's-eye parkir di FE (perlu payload waypoints pada `route.choice`
  dan render peta; rencanakan terpisah)

---

## 8. Batasan & Risiko

- **Parkir hanya live di CARLA.** `parking.step` keluar hanya saat `MARSHAL_DRIVING=carla` +
  `MARSHAL_PARKING=gemini`; tanpa CARLA pakai `eval/parking.py --publish` dengan `MARSHAL_BUS=gcp`.
- **Bus `memory` tidak lintas proses.** Demo lokal harus satu proses (plant + dashboard);
  lintas proses gunakan `MARSHAL_BUS=gcp` (Pub/Sub).
- **Dashboard `:8090` tanpa CORS** — jangan arahkan `VITE_EVENTS_URL` ke URL absolut lintas
  origin di produksi; pakai `marshal_api` (CORS siap) atau proxy.
- **Event `flow: 0`** (baris sistem dashboard, mis. "Dashboard started") dibuang schema FE
  (`flow` min 1) — disengaja.
- **Pill probabilitas hanya dari marshal_api** — jalur dashboard `:8090` tidak membawa `data`, jadi
  feed jatuh kembali ke teks `detail` (probs sudah tercetak di sana).
- Slot tujuan (mis. Y8) bukan hasil aturan biasa melainkan re-plan; tidak memengaruhi integrasi
  stream.

---

## 9. Kontrol demo dari dashboard (tombol)

Tombol halaman `/` kini tersambung ke **plant in-process** lewat `marshal_api/api/v1/plant.py` —
hanya aktif saat `MARSHAL_RUN_PLANT=1` (di host CARLA endpoint menjawab 409; plant nyata di sana
read-only dari sisi API).

| Tombol | Endpoint | Efek |
|:--|:--|:--|
| Play shift | `POST /api/v1/plant/spawn` | satu mobil bersih masuk ke line sekarang |
| Next exception | `POST /api/v1/plant/exception` | mobil berhenti di kardus & minta bantuan; kartu "Waiting on you" terisi (opsi + rekomendasi dari desk asisten) |
| Restart | `POST /api/v1/plant/restart` | plant dibangun ulang di bus yang sama (handler app lama dilepas lewat `bus.unsubscribe`/`app.close()`) |
| Opsi di kartu | `POST /api/v1/plant/assist/{case_id}/decide` | keputusan manusia; mobil jalan lagi, kartu kosong |

- **State**: `GET /api/v1/plant/state` (dipoll 2 s oleh `use-plant.ts`) memberi `running`, `cars`,
  `kpis`, dan kasus bantuan terbuka untuk kartu + badge "Live · demo plant".
- **Latest exception** di bawah header kini menampilkan event warn/bad terakhir dari feed, bukan
  teks contoh.
- **Chip "Everything / Exceptions only"** di Decision feed menyaring `level` warn/bad.
- **Mock mode** punya handler setara (`src/lib/mock/handlers/plant.ts`): kartu, spawn, exception,
  dan decide tetap berfungsi tanpa backend.
- Tombol "Play shift" sengaja = spawn satu mobil (plant sudah berjalan terus); checkbox "Pause
  when I need to" masih kosmetik.
