# Task 07 — Ingest Bukti CARLA dari Cloud Storage (Gemini → Dashboard)

> Dokumen ini untuk sisi **marshal-fe**. Backend-nya sudah selesai di `marshal-ai`; di sini
> dijelaskan kontrak API yang dipakai, alur yang seharusnya dilihat user, dan rekomendasi
> integrasi/perbaikan UI agar alurnya jelas.

## Tujuan

Memungkinkan hasil rekaman CARLA yang tersimpan di **Google Cloud Storage** dianalisis **Gemini**,
lalu muncul di dashboard sebagai **kartu assistance** yang bisa diputuskan supervisor — tanpa
menambah perubahan pada `marshal-fe`.

Konteksnya: saat pitching, CARLA tidak perlu hidup. Rekaman diambil dari GCS, Gemini yang menilai,
dan supervisor yang memutuskan.

---

## 1. Alur End-to-End

```
CARLA (offline)                 GCS                    Backend marshal_api           marshal-fe
─────────────────   ─────────────────────   ──────────────────────────────   ────────────────
run_carla_day5.sh   →   gs://bucket/...   →   POST /assistance/cases        →   GET /assistance/cases
replay_carla.py         (clip/foto)             ├─ ambil objek dari GCS           (list, polling 5s)
(--look cinematic)                              ├─ Gemini: assist.assess      →   GET /assistance/cases/{id}
                                                ├─ enforce_rules (kode)           ├─ EvidenceViewer (mp4/jpg)
                                                ├─ tulis AssistanceCase           ├─ kartu "Rekomendasi AI"
                                                ├─ tulis MediaArtifact            └─ pilih opsi → decide
                                                ├─ tulis EventLog + bus
                                                └─ 201 AssistanceCase
```

---

## 2. Kontrak API (backend `marshal_api`)

### 2.1 Buat case dari klip GCS (BARU)

```
POST /api/v1/assistance/cases
Role: supervisor (X-Actor-Role)
```

Request:

```json
{
  "clip_uri": "gs://marshal-artifacts-id-rd-ca-hanif-ali/assist/AC-1.jpg",
  "vin": "VIN-OK",
  "location": "test_track",
  "options": ["wait_for_removal", "pass_left_3kmh", "reroute_lane_c"],
  "situation": "opsional; kalau kosong, pakai kalimat Gemini"
}
```

Response `201` — bentuknya **sama persis** dengan `AssistanceCase` yang sudah dikonsumsi
halaman `/assistance`:

```json
{
  "case_id": "AC-A1B2C3",
  "vin": "VIN-OK",
  "location": "test_track",
  "situation": "A cardboard box is in the lane 2.3 m ahead; nobody in view.",
  "status": "OPEN",
  "opened_at": "2026-10-14T04:20:00Z",
  "moving_people_or_equipment": false,
  "recommendation": { "option_id": "wait_for_removal", "confidence": 0.7, "note": null },
  "options": [
    { "id": "pass_left_3kmh", "label": "pass left 3kmh", "risk": "medium", "reason": "lane beside the box is clear", "rank": 1 },
    { "id": "wait_for_removal", "label": "wait for removal", "risk": "low", "reason": "safe but delays the car", "rank": 2 },
    { "id": "reroute_lane_c", "label": "reroute lane c", "risk": "high", "reason": "not ranked by the model", "rank": 3 }
  ],
  "media_ids": ["01J..."],
  "resolved_by": null,
  "resolved_at": null,
  "chosen_option": null,
  "result": null
}
```

Catatan penting:
- `options` pada response **selalu lengkap**: opsi yang tidak diranking Gemini tetap ditambahkan
  oleh backend (opsi `wait*` = `low`, sisanya `high`). FE tidak perlu menambal.
- `media_ids[0]` adalah **id internal artefak**. `GET /media/{id}` kini menerima id internal
  maupun publik (`media_id`), jadi jangan berasumsi polanya `MED-*`.
- `recommendation` bisa `null` bila tidak ada opsi aman — tampilkan "Tidak ada rekomendasi dari agent".

Error:

| Status | `code` | Arti |
|:--|:--|:--|
| 422 | `validation_error` | `options` kosong / body tidak valid |
| 422 | `invalid_media_uri` | `clip_uri` bukan `gs://bucket/object` |
| 404 | `media_not_found` | objek tidak ada di bucket |
| 502 | `gcs_read_failed` / `assessment_failed` | GCS tidak terbaca / Gemini gagal |
| 503 | `gcs_unavailable` | `google-cloud-storage` tidak terpasang di proses API |

### 2.2 Endpoint yang sudah ada dan dipakai alur ini

| Method | Path | Fungsi |
|:--|:--|:--|
| `GET` | `/assistance/cases?open=true` | daftar case untuk halaman `/assistance` |
| `GET` | `/assistance/cases/{case_id}` | detail + opsi + `media_ids` (polling 5s) |
| `POST` | `/assistance/cases/{case_id}/decide` | supervisor memilih opsi → case `RESOLVED` |
| `GET` | `/media/{media_id}` | signed URL bila ada, kalau tidak `/api/v1/media/{id}/file` |
| `GET` | `/media/{media_id}/file` | stream byte media (video/gambar) dari GCS/lokal ke browser |
| `GET` | `/events` | SSE feed aktivitas (backfill dari `event_logs` + bus) |

`POST .../decide` body: `{ "option": "wait_for_removal", "actor_id": "sup-1" }`.

---

## 3. Contoh Pemakaian (curl)

```bash
# 1) buka case dari klip CARLA di GCS
curl -X POST localhost:8000/api/v1/assistance/cases \
  -H 'X-Actor-Role: supervisor' -H 'X-Tenant-ID: tenant-demo' \
  -H 'Content-Type: application/json' \
  -d '{
        "clip_uri": "gs://marshal-artifacts-id-rd-ca-hanif-ali/assist/AC-1.jpg",
        "vin": "VIN-OK",
        "location": "test_track",
        "options": ["wait_for_removal","pass_left_3kmh","reroute_lane_c"]
      }'

# 2) supervisor memutuskan
curl -X POST localhost:8000/api/v1/assistance/cases/AC-A1B2C3/decide \
  -H 'X-Actor-Role: supervisor' -H 'X-Tenant-ID: tenant-demo' \
  -H 'Content-Type: application/json' \
  -d '{"option":"wait_for_removal","actor_id":"sup-1"}'
```

Environment yang dibutuhkan proses API: `GOOGLE_APPLICATION_CREDENTIALS`,
`GOOGLE_GENAI_USE_VERTEXAI=TRUE`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, dan
`google-cloud-storage` terpasang (kalau tidak, media jatuh ke string `gs://` mentah dan tidak
bisa diputar browser).

---

## 4. Rekomendasi Integrasi API

Urut dari yang paling berdampak:

1. **Endpoint upload/registrasi klip (tanpa GCS CLI).** Saat ini klip harus sudah ada di bucket
   sebelum `POST /assistance/cases`. Tambah `POST /media` (multipart → GCS → `MediaArtifact`)
   supaya operator bisa menjatuhkan file rekaman langsung dari dashboard.
2. **Box deteksi per frame (`detected_objects`).** FE sudah menggambar box di `EvidenceViewer`,
   tapi `GET /assistance/cases/{id}` belum mengembalikannya dan model DB belum punya kolomnya.
   Tambah kolom JSON + DTO agar "apa yang dilihat Gemini" terlihat di atas video.
3. **Endpoint file lokal** (`GET /media/{id}/file`) — **sudah ada** sebagai fallback bila signed URL
   GCS tidak tersedia, jadi video tetap tampil saat demo luring tanpa private key.
4. **Event feed terjamin.** Backend menulis `event_logs` + publish bus, jadi `LiveActivityFeed`
   realtime. Pastikan proses API dan publisher berbagi bus yang sama (bridge saat ini
   `InMemoryBus`); untuk lintas proses, pertimbangkan Pub/Sub seperti `marshal_ai.events.make_bus("gcp")`.
5. **Metadata sumber.** Tambahkan `source` (`car_evidence` | `live` | `seed`) dan `clip_uri` pada
   DTO case agar UI bisa membedakan kasus dari rekaman CARLA vs live.
6. **Idempotensi ambil case.** `POST /assistance/cases` saat ini selalu membuat case baru untuk
   `clip_uri` yang sama. Untuk demo berulang, kembalikan case yang sudah ada bila `clip_uri` sama.

---

## 5. Rekomendasi Perbaikan UI (memperjelas alur user)

Halaman yang terlibat: `/assistance` (list), `/assistance/$case_id` (detail + keputusan),
`LiveActivityFeed` (event), `/quality/*` (tindak lanjut kualitas).

1. **Badge sumber bukti.** Di header case, tampilkan chip "Rekaman CARLA" / "Live" (dan nama
   bucket/clip kecil) supaya user paham ini analisis dari video, bukan mobil sungguhan.
2. **Stepper status yang eksplisit.** `OPEN → (diputuskan) → RESOLVED` dengan penanda waktu.
   Alasan: kartu ini masuk lewat alur baru (ingest), user perlu tahu "saya di langkah mana".
3. **Kotak deteksi di atas video.** Aktifkan `boxes={data.detected_objects}` (butuh poin API #2)
   dan label objek (`box`, `worker`) agar "apa yang menghalangi" terbaca tanpa membaca teks.
4. **Pisahkan AI vs keputusan manusia.** Kartu "Rekomendasi AI" sudah menulis catatan
   "bukan keputusan" — pertahankan, dan tampilkan opsi + risk level (low/medium/high) dengan warna
   agar user bisa menimbang, bukan asal klik rekomendasi.
5. **Guard role yang terlihat.** Sembunyikan/matikan tombol "Submit Keputusan" untuk role
   non-supervisor, dengan tooltip singkat ("hanya supervisor"). Backend tetap memverifikasi.
6. **Jalur masuk yang jelas.** Dari `/lab` (insiden → skenario) tambahkan tautan balik ke case
   asal, dan sebaliknya tombol "Kirim ke Test Lab" sudah ada di detail case — buat keduanya
   konsisten (breadcrumb + status), supaya siklus assist → test terbaca sebagai satu alur.
7. **Kosong/gagal yang informatif.** `EvidenceViewer` sudah menangani "Media telah kedaluwarsa";
   tambahkan untuk kasus `recommendation === null` ("agent tidak menemukan opsi aman") dan
   `media_ids` kosong ("bukti tidak tersedia untuk case ini").
8. **Timeline keputusan.** Setelah `RESOLVED`, tampilkan ringkas: sumber bukti → rekomendasi AI →
   opsi terpilih → oleh siapa → kapan. Ini yang paling menjual saat pitching.

---

## 6. Checklist Tindak Lanjut

**Backend (marshal-ai)**
- [x] `POST /api/v1/assistance/cases` (ingest dari `gs://`)
- [x] Ambil objek dari GCS (inline untuk foto, URI untuk klip besar)
- [x] Gemini `assist.assess` + `enforce_rules` di kode
- [x] Tulis `MediaArtifact` + `AssistanceCase` + opsi + `EventLog`, publish bus
- [x] `GET /media/{id}` menerima id internal maupun publik
- [x] `GET /media/{id}/file` (fallback stream byte dari GCS/lokal)
- [ ] Kolom + DTO `detected_objects`
- [ ] Endpoint upload media
- [ ] `source`/`clip_uri` pada DTO, idempotensi per `clip_uri`

**Frontend (marshal-fe)**
- [ ] Badge sumber ("Rekaman CARLA" / "Live")
- [ ] Stepper status OPEN → RESOLVED
- [ ] Aktifkan overlay `detected_objects` pada video
- [ ] Guard role + disabled state pada keputusan
- [ ] Empty state untuk `recommendation === null` / `media_ids` kosong
- [ ] Timeline keputusan setelah resolved

---

## 7. Verifikasi

- Unit/integration: `tests/test_assist_ingest.py` (marshal-ai) — ingest, validasi opsi, URI non-gs,
  dan bahwa case + media + event benar-benar tertulis.
- Manual: jalankan API, `POST` seperti contoh curl, buka `/assistance`, pastikan kartu muncul,
  video/media terputar, lalu `decide` dan cek status `RESOLVED`.

**Risiko yang perlu diketahui:** bila proses API tidak punya akses GCS (SDK atau kredensial),
signed URL **dan** endpoint `/file` sama-sama gagal, jadi bukti tidak bisa diputar — pastikan
`.[gcp]` terpasang dan kredensial dibaca. `POST /assistance/cases` juga belum idempotent: memanggil
ulang `clip_uri` yang sama membuat case baru.

---

## 8. Cara Testing dari Dashboard (langkah demi langkah)

Alur uji: **ambil video → daftarkan ke backend → video tampil di dashboard → putuskan**.

### Prasyarat

- `marshal-ai` dengan extra GCP terpasang (storage/bigquery):
  ```bash
  cd marshal-ai && uv pip install -e ".[gcp]"
  ```
- Kredensial Gemini + GCS (service account JSON):
  ```
  GOOGLE_APPLICATION_CREDENTIALS=~/.config/marshal/sa.json
  GOOGLE_GENAI_USE_VERTEXAI=TRUE
  GOOGLE_CLOUD_PROJECT=id-rd-ca-hanif-ali
  GOOGLE_CLOUD_LOCATION=us-central1
  ```
- `bun` untuk menjalankan `marshal-fe`.

### Langkah 1 — Dapatkan video CARLA

Di host CARLA (opsi A), lalu unggah ke bucket:

```bash
# host CARLA: rekam + filmkan satu flow
bash scripts/run_carla_all.sh                    # semua flow + film mp4
# atau kasus assist saja
bash scripts/run_carla_day5.sh
bash scripts/run_carla_replay.sh <recording-day5> --out /tmp/AC-1.mp4 --look cinematic

# unggah ke Cloud Storage
gcloud storage cp /tmp/AC-1.mp4 gs://marshal-artifacts-id-rd-ca-hanif-ali/assist/AC-1.mp4
```

> Untuk smoke test cepat, mp4 apa saja boleh — yang penting ada di bucket dan Gemini bisa membacanya.
> Ingat: uploader CARLA menulis bucket `marshal-artifacts-<PROJECT>`, bukan `marshal-artifacts`.

### Langkah 2 — Siapkan DB dan jalankan API

```bash
cd marshal-ai
alembic upgrade head                 # sekali saja bila tabel belum ada
python scripts/seed_database.py      # tenant-demo, plant, cars

GOOGLE_APPLICATION_CREDENTIALS=~/.config/marshal/sa.json \
GOOGLE_GENAI_USE_VERTEXAI=TRUE GOOGLE_CLOUD_PROJECT=id-rd-ca-hanif-ali \
GOOGLE_CLOUD_LOCATION=us-central1 \
.venv/bin/uvicorn marshal_api.main:app --port 8000
```

### Langkah 3 — Buka case dari video (trigger ingest)

```bash
curl -s -X POST localhost:8000/api/v1/assistance/cases \
  -H 'X-Actor-Role: supervisor' -H 'X-Tenant-ID: tenant-demo' \
  -H 'Content-Type: application/json' \
  -d '{
        "clip_uri": "gs://marshal-artifacts-id-rd-ca-hanif-ali/assist/AC-1.mp4",
        "vin": "VIN-OK",
        "location": "test_track",
        "options": ["wait_for_removal","pass_left_3kmh","reroute_lane_c"]
      }' | python -m json.tool
```

Catat `case_id` dan `media_ids[0]`. Verifikasi media bisa diambil:

```bash
# metadata media: url = signed URL, atau /api/v1/media/<id>/file bila tanpa signer
curl -s localhost:8000/api/v1/media/<MEDIA_ID> | python -m json.tool

# unduh byte-nya dan cek tipenya (harus video/mp4)
curl -s -o /tmp/out.mp4 localhost:8000/api/v1/media/<MEDIA_ID>/file
file /tmp/out.mp4
```

Jika `file /tmp/out.mp4` menyebut MP4, video sudah siap ditampilkan dashboard.

### Langkah 4 — Jalankan dashboard dan lihat videonya

```bash
cd marshal-fe
bun install
bun run dev        # http://localhost:5173, VITE_MOCK_MODE=false (default .env.development)
```

Vite mem-proxy `/api` → `127.0.0.1:8000`, jadi dashboard memakai API lokal.

1. Buka **http://localhost:5173/assistance** → kartu case baru muncul (polling 5s).
2. Klik kasus → panel **Evidence** memutar video/gambar (`EvidenceViewer` sudah mendukung MP4),
   kartu **Rekomendasi AI** menampilkan opsi + confidence.
3. Pilih opsi → **Submit Keputusan** → dialog konfirmasi → status jadi **RESOLVED**.
4. Panel **Live Activity** menampilkan event `Assist case ...` dari `EventLog`/bus.

### Langkah 5 — Verifikasi lewat API (opsional)

```bash
curl -s 'localhost:8000/api/v1/assistance/cases?open=true' -H 'X-Tenant-ID: tenant-demo' | python -m json.tool
curl -N  localhost:8000/api/v1/events                      # SSE: event baru mengalir
```

### Troubleshooting

| Gejala | Penyebab / solusi |
|:--|:--|
| Kartu tak muncul | Proses API beda tenant; pastikan header `X-Tenant-ID: tenant-demo` dan `seed_database.py` sudah jalan. |
| Video tidak terputar, `<video>` kosong | Cek `Content-Type` respons `/media/{id}/file` (`video/mp4`) dan `kind == "clip"` dari `/media/{id}`. |
| `503 gcs_unavailable` | `google-cloud-storage` belum terpasang → `uv pip install -e ".[gcp]"`. |
| `404 media_not_found` | Nama bucket/objek salah. Bucket hasil CARLA = `marshal-artifacts-<PROJECT>`. |
| `url` berupa `gs://...` mentah | Tidak ada signer **dan** `kind` disalahartikan; endpoint file seharusnya jadi fallback. Cek `storage_uri` pada baris `MediaArtifact`. |
| Signed URL 403 | SA tidak punya hak objek; biarkan fallback `/file` yang dipakai (API yang membaca GCS). |

### Smoke test tanpa GCS/Gemini (cepat)

Untuk menguji **UI menampilkan video** tanpa bucket/kredensial: sisipkan `MediaArtifact` dengan
`storage_uri` menunjuk file lokal (mis. `/tmp/AC-1.mp4`), plus `AssistanceCase` yang merujuknya,
lalu buka halaman. `read_media` membaca dari disk dan `/media/{id}/file` menyajikannya. Ini menguji
jalur tampilan, bukan jalur Gemini.

