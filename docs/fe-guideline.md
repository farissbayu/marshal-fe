# Rencana Implementasi Frontend Operasional Marshal

## Tujuan dokumen

Dokumen ini menjelaskan rencana frontend web untuk operator dan engineer Marshal, termasuk halaman, tata letak, interaksi, kontrak API yang dibutuhkan, dan rancangan fungsi mock untuk mengembangkan UI sebelum backend tersedia.

Rencana ini berfokus pada kebutuhan produk dan kontrak HTTP, bukan struktur source code atau file tertentu. Untuk menerapkannya pada project lain, sesuaikan nama domain seperti mobil, yard, inspeksi, dan test lab dengan resource serta alur kerja project tersebut. Pola halaman, aturan interaksi, dan mock API dapat dipakai sebagai template.

## Ruang lingkup produk

Frontend menjadi konsumen HTTP/JSON bagi backend dan memiliki dua area kerja utama:

1. **Control tower / operasi:** kondisi yard dan mobil, kasus bantuan, inspeksi, keputusan manusia, laporan, dan rework.
2. **Test lab:** permintaan uji, pembuatan dan review skenario, pencarian adversarial, evaluasi, dan approval release.

Frontend tidak menjalankan business logic atau AI. Ia menampilkan data yang diterima dari API, mengirim aksi yang dipilih user, dan menunjukkan hasilnya. Backend tetap menjadi sumber kebenaran untuk validasi, aturan keselamatan, status, keputusan, dan otorisasi.

## Tujuan dan prinsip UI

- Operator dapat mengenali keadaan penting dan pekerjaan yang menunggu tanpa membaca log teknis.
- Keputusan yang menjadi hak manusia dilakukan secara eksplisit oleh orang yang terautentikasi, dengan konteks yang cukup untuk bertindak.
- Temuan AI ditampilkan sebagai rekomendasi/evidence; UI tidak mengubahnya menjadi keputusan manusia.
- Semua aksi menunjukkan status mengirim, berhasil, ditolak, atau gagal.
- UI hanya menampilkan informasi yang benar-benar dikembalikan API. Media atau update langsung yang belum tersedia tidak boleh disimulasikan seolah-olah tersedia.
- Desain diutamakan untuk workstation control tower, tetap nyaman di tablet, dan menyediakan review/assistance dasar di layar sempit.
- Nama route dan field di bagian kontrak API adalah usulan kontrak. Implementasi dapat memakai nama lain asalkan tanggung jawab dan bentuk datanya tetap tersedia.

## Pengguna dan kewenangan

| Pengguna                   | Aktivitas utama                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Supervisor/operator        | Memantau yard, memilih opsi assistance, menyetujui/menolak re-plan atau rework, mengonfirmasi review inspeksi |
| Inspector/quality operator | Membaca evidence, hasil inspeksi/checklist, laporan, dan status rework                                        |
| Worker                     | Melihat tugas rework yang relevan dan menandai perbaikan selesai                                              |
| Engineer                   | Membuat/review skenario, membaca hasil adversarial/regression, menyetujui release jika gate lulus             |

Role di UI bukan kontrol keamanan. Backend wajib memverifikasi autentikasi dan otorisasi. Identitas actor yang dikirim pada aksi harus berasal dari sesi/identitas terverifikasi, bukan text field yang dapat diisi bebas. Actor switcher hanya boleh ada dalam mode development/demo yang dibatasi.

## Stack dan bentuk aplikasi

Tech stack yang ditetapkan untuk frontend ini:

- **Runtime & Package Manager**: **Bun** untuk instalasi dependensi, script eksekusi, dan build yang cepat.
- **UI Framework**: **React + TypeScript + Vite** untuk membangun UI berbasis komponen yang type-safe dan dapat dibangun/deploy terpisah dari backend.
- **Routing**: **TanStack Router** untuk file-based routing bertipe penuh, pengelolaan URL yang sinkron dengan filter/search params (dapat di-refresh dan dibagikan), serta handling breadcrumb/detail yang presisi.
- **Server State & Data Fetching**: **TanStack Query** untuk caching data API, refetch berkala/visibility-aware, loading/error state, serta invalidasi otomatis setelah mutasi.
- **Styling**: **Tailwind CSS** untuk utility styling yang konsisten dengan tema **profesional manufaktur** (kontras tinggi, dark control tower palette, industrial status colors).
- **Komponen UI**: **shadcn/ui** untuk fondasi komponen antarmuka yang aksesibel dan modular (Table, Dialog, Card, Tabs, Badge, Alert, Skeleton, Switch).
- **Validasi Skema**: **Zod** (jika perlu) untuk memvalidasi kontrak response API, parsing payload, dan validasi form input operasional.
- **Global Client State**: **Zustand** (jika perlu) untuk mengelola state sesi/identitas actor aktif, buffer realtime log stream (SSE), dan preferensi tampilan kamera.
- **Testing**: **Vitest** dan **React Testing Library** untuk test komponen/flow; **Playwright** untuk journey browser kritis.

Frontend dideploy sebagai aplikasi web terpisah. Base URL backend berasal dari konfigurasi deployment, bukan hard-coded. Frontend dapat memakai reverse proxy satu origin atau host terpisah dengan CORS terbatas. Jangan membuat frontend mengakses database, storage privat, simulator, atau service AI secara langsung.

Untuk deployment demo/preview dengan mock data mandiri ke Cloudflare Pages, lihat panduan detail di [deployment-cloudflare.md](./deployment-cloudflare.md).

## Navigasi dan app shell

Gunakan app shell konsisten di semua halaman:

- Sidebar: **Overview**, **Yard**, **Cars**, **Action center**, **Assistance**, **Quality & rework**, dan **Test lab**.
- Test lab memiliki tab **Requests**, **Scenarios**, dan **Releases**.
- Header menunjukkan nama service/plant, koneksi API, waktu data terakhir diperbarui, dan identitas/role operator.
- Halaman detail menggunakan breadcrumb; aksi utama ditempatkan konsisten di header atau panel konteks.
- Semua halaman memiliki loading, empty, error, dan offline state yang jelas.

## Halaman dan rancangan tampilannya

### 1. Overview — `/overview`

**Tujuan:** ringkasan awal shift yang menyorot pengecualian dan tindakan yang perlu perhatian.

**Tata letak:**

1. Bar status: koneksi API, status service, plant/backend aktif bila tersedia, dan waktu refresh.
2. Kartu KPI: mobil per status penting, assistance open, proposal menunggu keputusan, serta indikator kualitas/rework yang tersedia.
3. Dua kolom utama: **Butuh tindakan** (assistance/proposal) dan **Operasi yard** (mobil menunggu atau mengalami exception).
4. Bagian bawah: ringkasan skenario/release terbaru yang gagal atau menunggu review.

Klik kartu atau baris membuka halaman terkait dengan filter yang sesuai. KPI harus berasal dari API, bukan dihitung dari sampel data yang tidak lengkap.

**API yang dipakai:** health/readiness, overview, KPI, yard, proposals, assistance cases, dan ringkasan test lab. Lihat katalog API di bawah untuk tujuan dan mock setiap endpoint.

**Update MVP:** bila backend belum menyediakan event stream, gunakan polling terbatas (misalnya 5 detik untuk queue aktif dan lebih jarang untuk KPI), tombol refresh, serta waktu data terakhir diperbarui. Kurangi/hentikan polling saat tab browser tersembunyi.

### 2. Yard — `/yard`

**Tujuan:** melihat kondisi yard dan menjalankan aksi operasional yang tersedia.

**Tata letak:**

- Ringkasan jumlah mobil per status dan exception.
- Tabel mobil: VIN, status, lokasi, mission, truck, slot, flags, update terakhir.
- Panel truck: truck ID, ETA, jadwal, delay, dan mobil yang ditujukan untuk truck itu.
- Panel zone closure dan rework bays.
- Bila API memberikan geometri/koordinat yang sesuai, tampilkan peta skematis. Jika hanya tersedia nama titik/route, tampilkan diagram titik atau daftar; jangan merekayasa peta lantai.

**Aksi:** kirim mission, hold, resume, update ETA truck, tutup/buka zone, dan load truck bila backend menyediakan aksi tersebut. Dialog mission harus menampilkan VIN, lokasi sekarang, tujuan, alasan, dan konfirmasi. Backend tetap memvalidasi aksi terhadap state terkini.

### 3. Cars — `/cars` dan `/cars/{vin}`

**Daftar mobil:** pencarian VIN; filter status, lokasi, truck, dan flags; gunakan pagination/server-side filter bila jumlah data bertambah.

**Detail mobil:**

- Ringkasan VIN, build sheet, status, lokasi, mission, slot, truck, flags, dan waktu update.
- Riwayat checkpoint hanya ditampilkan bila API menyediakan history/event. Jika hanya ada status saat ini, tampilkan status tersebut tanpa membuat timeline historis.
- Panel visual inspection, functional checklist, car report, dan tiket rework dengan tautan ke detail terkait.
- Aksi yang tersedia sesuai konteks state; backend tetap menjadi penentu akhir valid/tidaknya aksi.

### 4. Action center — `/actions`

**Tujuan:** antrean keputusan manusia, terpisah dari rekomendasi AI dan keputusan yang sudah final.

**Tata letak:** tab **Re-plan**, **Inspection review**, **Rework**, dan tautan/tab **Assistance**. Setiap item menampilkan ID/VIN, kategori, ringkasan, waktu menunggu, alasan/rekomendasi, status, dan tombol membuka detail.

Pada detail, tampilkan payload/proposal, efek keputusan, opsi yang diizinkan, dan identitas actor. Gunakan tombol spesifik seperti **Setujui re-plan**, **Tolak re-plan**, **Konfirmasi rework**, bukan tombol generik. Minta konfirmasi untuk aksi yang menggerakkan kendaraan atau mengubah status release.

### 5. Assistance — `/assistance` dan `/assistance/{case_id}`

Halaman prioritas keselamatan karena mobil tetap berhenti sampai manusia memilih.

**Daftar:** case open diurutkan berdasarkan urgensi/umur; tampilkan VIN, lokasi, situasi singkat, status eskalasi, dan waktu menunggu.

**Kartu/detail case:**

1. VIN, posisi, waktu open, situasi, status mobil/case.
2. Clip/evidence image bila tersedia melalui akses browser yang aman.
3. Opsi persis dari backend; tampilkan risiko dan alasan ranking bila tersedia.
4. Rekomendasi agent, confidence, dan indikator orang/peralatan bergerak sebagai konteks; rekomendasi bukan pilihan final.
5. Pilihan manusia menggunakan radio/card selection. Submit baru aktif setelah user memilih opsi dan mengonfirmasi.
6. Setelah submit, tampilkan pilihan, resolved-by, waktu, hasil, dan error jika ada.

Jangan membuat opsi baru, memilih rekomendasi secara default, atau mengubah opsi yang ditawarkan. Jika ada orang/peralatan bergerak, indikator risiko harus jelas dan UI hanya mengirim salah satu opsi yang diizinkan backend.

### 6. Quality & inspections — `/quality/inspections`

**Daftar/queue:** VIN, jenis pemeriksaan, verdict, jumlah finding/failed check, waktu, status review. Filter verdict, visual/functional, VIN, dan periode bila didukung API.

**Detail:**

- Visual: verdict, finding per body zone, defect, ukuran, confidence, observation, evidence image, dan mismatch build sheet.
- Functional: checklist per langkah, nilai telemetry, hasil kamera, confidence, observation, dan clip. Tampilkan disagreement telemetry/kamera dengan jelas.
- Link ke report final.
- Form review hanya tampil ketika review masih pending; actor dan keputusan harus eksplisit.

### 7. Reports & rework — `/quality/rework` dan `/cars/{vin}/report`

**Daftar:** report/verdict, VIN, finding terbuka, bay, status repair, reinspection, waktu update; filter verdict, bay, dan status rework.

**Report detail:** summary, visual finding/evidence, functional failed checks, tiket rework, siapa yang mengonfirmasi, repair completion, hasil reinspection, dan verdict keseluruhan.

**Aksi:** supervisor mengonfirmasi proposal rework/clear sesuai aturan; worker menandai repair selesai. Setelah aksi, tampilkan status menunggu reinspection bila hasil baru belum tersedia.

### 8. Test lab — `/lab`

Gunakan tab internal; test lab adalah alur kerja engineer, bukan panel KPI saja.

#### Tab Requests

- Daftar test request dari assistance case atau input manusia, beserta source, ringkasan, waktu, dan status konversi ke skenario.
- Form **Generate scenario** menerima deskripsi bahasa alami dan source yang diizinkan.
- Submit memulai job dan tidak memblokir halaman.

#### Tab Scenarios

- Tabel scenario ID, source, status, tags, waktu, owner.
- Detail berisi spec terformat/read-only, notes/error validator, metrik dry-run, dan review status.
- Scenario pending menyediakan approve/reject dengan note dan actor engineer.
- Scenario runnable menyediakan adversarial search. Hasil menampilkan jumlah run, robustness/verdict, failing variant terkecil, criteria/metrics, report, dan evidence bila tersedia.

#### Tab Releases

- Daftar release, evaluasi terakhir, passed/failed tests, blocked/approved, waktu.
- **Evaluate release** membuat job dan menampilkan status/progress/hasil.
- **Approve release** hanya tersedia setelah evaluasi selesai dan backend gate mengizinkan; konfirmasi engineer wajib.
- Hasil gagal menampilkan test, metric terhadap criteria, report, dan evidence.

## Gaya visual dan komponen bersama

### Gaya visual

- Nuansa control tower yang tenang; pilih satu tema kontras tinggi dan gunakan konsisten.
- Desktop menampilkan informasi ringkas dalam tabel/panel; layout menjadi satu kolom pada layar sempit.
- Hijau untuk PASS/success, amber untuk REVIEW/pending, merah untuk FAIL/blocked/error, netral untuk informasi. Sertakan label/icon/teks agar warna bukan satu-satunya pembeda.
- Gunakan status badge konsisten untuk car, verdict, proposal, scenario, dan job.
- Hindari animasi berlebihan; hormati preferensi reduced motion dan jangan gunakan alert berkedip.

### Komponen bersama

- App shell, sidebar, top bar, API connection badge, page header, breadcrumbs.
- KPI card, status badge, data table, filter bar, empty state, loading skeleton, error panel, last updated.
- Decision card/dialog, actor identity, evidence viewer, checklist table, job status panel.
- Evidence viewer harus menangani media unavailable/expired dengan jelas. URI storage internal tidak boleh diperlakukan sebagai URL browser publik.

### Perilaku interaksi

- Setelah mutasi sukses, tampilkan hasil spesifik dan refresh data yang terkait.
- Saat mutasi pending, cegah submit ganda. Gunakan idempotency key bila API mendukungnya.
- Pertahankan nilai form dan tampilkan error field-level dari validasi API.
- `401/403` meminta autentikasi/menjelaskan akses; `404` menunjukkan resource tidak ditemukan; `409` menjelaskan konflik state dan menyediakan refresh; `422` menunjukkan input yang perlu diperbaiki; `503` menandai dependency unavailable.
- Polling terbatas, berhenti saat halaman/tab tidak aktif bila sesuai, dan selalu tampilkan freshness data.
- Filter/detail disimpan di URL/query parameters agar dapat di-refresh atau dibagikan.

## Katalog API dan rancangan mock

Endpoint berikut adalah kontrak usulan untuk mengimplementasikan halaman. Mock dapat memakai data fixture deterministik, tetapi setiap mock function harus mempertahankan tujuan, bentuk response, aturan validasi, dan efek mutasi yang sama seperti backend.

### Health, identity, dan ringkasan

| API                    | Tugas API                                                                  | Data minimum untuk UI/mock                                      | Tanggung jawab mock function                                                          |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `GET /healthz`         | Menunjukkan proses backend hidup.                                          | Status liveness.                                                | Mengembalikan status sehat/tidak sehat yang dapat diubah pada test offline.           |
| `GET /readyz`          | Menunjukkan backend siap melayani request dan dependency penting tersedia. | Status readiness dan dependency yang gagal bila ada.            | Dapat disetel ready/unready untuk menguji badge koneksi dan halaman unavailable.      |
| `GET /api/v1/me`       | Memberi identitas actor aktif dan role/permission frontend.                | Actor ID, display name, role, izin aksi.                        | Mengembalikan user fixture per role untuk menguji supervisor, worker, dan engineer.   |
| `GET /api/v1/overview` | Menyediakan snapshot ringkas untuk halaman Overview.                       | Ringkasan mobil, exception, pending decisions, assistance, lab. | Menggabungkan fixture yang konsisten dengan response yard, proposals, cases, dan lab. |
| `GET /api/v1/kpis`     | Menyediakan metrik operasi dan kualitas.                                   | KPI beserta label/unit/periode bila tersedia.                   | Mengembalikan nilai deterministik; menyediakan fixture nol-data dan kondisi warning.  |

### Yard, mobil, dan peta

| API                                   | Tugas API                                                                   | Data minimum untuk UI/mock                                                            | Tanggung jawab mock function                                                           |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/v1/yard`                    | Memberi status yard, trucks, zone closures, bays, dan exception.            | Mobil ringkas, truck/ETA, zone, bays, timestamp.                                      | Mengembalikan plant fixture dengan beberapa mobil/truck/zone yang saling konsisten.    |
| `GET /api/v1/cars`                    | Mengembalikan halaman daftar mobil, dengan filter/pagination bila didukung. | VIN, state, location, mission, truck, slot, flags, updated time, pagination metadata. | Memfilter fixture menurut query dan mengembalikan hasil/page yang stabil.              |
| `GET /api/v1/cars/{vin}`              | Mengembalikan detail satu mobil.                                            | Build sheet, state, location, mission, slot, truck, flags, timestamps.                | Mengembalikan detail fixture; menghasilkan not-found untuk VIN yang tidak dikenal.     |
| `GET /api/v1/map`                     | Memberi nama titik, zona, route, dan geometri bila tersedia.                | Daftar point/zone/route dan optional coordinates.                                     | Mengembalikan map fixture sederhana; UI dapat diuji tanpa peta visual.                 |
| `POST /api/v1/trucks/{truck_id}/eta`  | Mencatat atau memperbarui ETA truck.                                        | Body ETA aktual dan scheduled ETA opsional; hasil delay/status.                       | Memperbarui truck fixture dan menolak ID yang tidak dikenal bila kontrak mensyaratkan. |
| `POST /api/v1/trucks/{truck_id}/load` | Meminta load truck setelah guard domain terpenuhi.                          | Hasil load dan mobil yang dimuat/ditolak.                                             | Mengubah state fixture hanya jika kondisi lulus; menyediakan kasus blocked.            |
| `POST /api/v1/zones/{zone}/closure`   | Menutup atau membuka zone.                                                  | Body closed boolean; state zone/hasil yang diperbarui.                                | Mengubah status zone fixture dan menolak zone yang tidak dikenal.                      |
| `POST /api/v1/cars/{vin}/missions`    | Mengirim mission untuk satu mobil.                                          | Tujuan/waypoints, reason, mission ID/status hasil.                                    | Memperbarui mission/state fixture atau mengembalikan validation/domain error.          |
| `POST /api/v1/cars/{vin}/hold`        | Meminta mobil ditahan.                                                      | Reason, optional duration, status held.                                               | Mengubah state fixture menjadi held/menolak state yang tidak valid.                    |
| `POST /api/v1/cars/{vin}/resume`      | Melanjutkan mobil yang di-hold.                                             | Status resumed dan mission saat ini.                                                  | Menghapus status held pada fixture atau mengembalikan conflict.                        |

### Proposal dan keputusan manusia

| API                                           | Tugas API                                                                                  | Data minimum untuk UI/mock                                                  | Tanggung jawab mock function                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/proposals?kind=...`              | Mencari proposal yang menunggu atau telah diputuskan, dapat difilter menurut jenis/status. | Proposal ID, kind, summary, payload, status, created time, allowed actions. | Memfilter proposal fixture dan mengembalikan tab antrean yang konsisten.                                          |
| `POST /api/v1/proposals/{proposal_id}/decide` | Mencatat keputusan manusia pada proposal.                                                  | Body decision dan actor; response status/decision record.                   | Memastikan proposal pending dan action valid, menyimpan actor, memperbarui fixture; menyediakan conflict fixture. |

Keputusan assistance memakai endpoint terpisah karena pilihan harus berasal dari opsi yang ditawarkan driving system.

### Assistance

| API                                              | Tugas API                                                             | Data minimum untuk UI/mock                                                                        | Tanggung jawab mock function                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/v1/assistance/cases?open=true`         | Mengembalikan daftar assistance case untuk queue.                     | Case ID, VIN, location, situation, options, recommendation, risk, opened time, escalation/status. | Menyediakan beberapa case fixture, termasuk orang dekat, kasus eskalasi, dan case selesai. |
| `GET /api/v1/assistance/cases/{case_id}`         | Mengembalikan detail/evidence satu case.                              | Data list ditambah clip/evidence reference, ranking, confidence, resolved-by/choice.              | Mengembalikan detail fixture atau not-found.                                               |
| `GET /api/v1/assistance/kpis`                    | Mengembalikan metrik assistance.                                      | Open/resolved count dan latency/periode bila tersedia.                                            | Mengembalikan metrik deterministik dari fixture case.                                      |
| `POST /api/v1/assistance/cases/{case_id}/decide` | Mengirim pilihan eksplisit supervisor di antara opsi yang ditawarkan. | Body option dan actor; hasil pilihan/resolution.                                                  | Menolak opsi di luar daftar, merekam actor dan choice, memperbarui case fixture.           |

### Inspection, report, dan rework

| API                                                  | Tugas API                                               | Data minimum untuk UI/mock                                                                    | Tanggung jawab mock function                                                     |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/v1/inspection/results?kind=&verdict=&vin=` | Mencari hasil inspeksi untuk queue/history.             | VIN, kind, verdict, finding/check counts, timestamp, review status.                           | Mendukung filter dan skenario PASS/REVIEW/FAIL.                                  |
| `GET /api/v1/cars/{vin}/inspection/visual`           | Mengembalikan hasil visual per mobil.                   | Verdict, finding per zone, type, size, confidence, observation, evidence reference, mismatch. | Memberi fixture clean, review, dan failed dengan media placeholder.              |
| `GET /api/v1/cars/{vin}/inspection/functional`       | Mengembalikan checklist functional per mobil.           | Checklist step, telemetry, camera result/confidence, observation, clip reference.             | Menyediakan kasus agree/disagree antara telemetry dan kamera.                    |
| `GET /api/v1/inspection/kpis`                        | Mengembalikan metrik kualitas inspeksi.                 | First-pass yield, review share, failure counts/periode.                                       | Mengembalikan nilai konsisten dengan fixture result.                             |
| `GET /api/v1/reports?verdict=&bay=`                  | Mengembalikan daftar report/rework untuk halaman queue. | VIN, verdict, summary, finding count, bay/status, updated time.                               | Memfilter report fixture dan menyediakan pagination bila diminta.                |
| `GET /api/v1/cars/{vin}/report`                      | Mengembalikan report lengkap per mobil.                 | Summary, findings, failed checks, rework tickets, reinspection, verdict.                      | Mengembalikan report yang terkait dengan fixture VIN yang sama.                  |
| `GET /api/v1/rework/bays`                            | Mengembalikan daftar bay dan kapasitas/status.          | Bay ID/name, availability/capacity, active work bila tersedia.                                | Menyediakan bay open/full fixture untuk menguji status.                          |
| `POST /api/v1/cars/{vin}/rework/done`                | Menandai pekerjaan perbaikan selesai oleh worker.       | Actor worker dan hasil/ticket updated.                                                        | Memvalidasi ticket yang ada, menyimpan worker/waktu, memperbarui report fixture. |

Review inspection/rework dapat memakai decision API proposal selama proposal menyediakan jenis, allowed actions, dan data actor dengan jelas.

### Test lab dan job

| API                                                           | Tugas API                                                                 | Data minimum untuk UI/mock                                        | Tanggung jawab mock function                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/lab/test-requests`                               | Mengembalikan permintaan uji dari insiden/operator.                       | Request ID, source, text, created time, status skenario.          | Mengembalikan fixture request baru dan yang telah diproses.                                             |
| `GET /api/v1/lab/scenarios`                                   | Mengembalikan daftar skenario dan statusnya.                              | ID, source, status, tags, owner, created time, summary.           | Mendukung filter status dan pagination terhadap fixture.                                                |
| `GET /api/v1/lab/scenarios/{scenario_id}`                     | Mengembalikan spec, validator notes, dry-run metrics, dan review.         | Spec, status, errors/notes, metrics, review record.               | Memberi skenario dry-run pass, pending review, rejected, dan not-found.                                 |
| `POST /api/v1/lab/scenarios`                                  | Meminta pembuatan dan dry-run skenario dari deskripsi.                    | Body situation/source; response job ID atau hasil sesuai kontrak. | Membuat job fixture yang bergerak dari running ke done/failed dan mengaitkan hasil scenario.            |
| `POST /api/v1/lab/scenarios/{scenario_id}/review`             | Merekam approve/reject engineer beserta note.                             | Body decision, actor, note; response status baru.                 | Hanya menerima scenario pending review, merekam actor/note dan mengubah fixture status.                 |
| `POST /api/v1/lab/scenarios/{scenario_id}/adversarial-search` | Memulai pencarian variasi pada scenario yang runnable.                    | Scenario ID; response job ID.                                     | Membuat job fixture lalu menghasilkan laporan/metrics dengan successful dan failed example.             |
| `GET /api/v1/lab/releases`                                    | Mengembalikan release yang dapat dievaluasi dan status evaluasi terakhir. | Release ID, evaluation status, summary, approval status.          | Menyediakan satu release pass dan satu release blocked untuk menguji UI.                                |
| `POST /api/v1/lab/releases/{release}/evaluate`                | Memulai regression evaluation untuk release.                              | Release ID; response job ID.                                      | Membuat job fixture dan menentukan hasil berdasarkan fixture release.                                   |
| `POST /api/v1/lab/releases/{release}/approve`                 | Merekam approval engineer setelah gate lulus.                             | Actor engineer; response approved/status atau rejection.          | Mengizinkan approval hanya jika hasil evaluasi terakhir lulus; case fail mengembalikan conflict.        |
| `GET /api/v1/jobs/{job_id}`                                   | Mengambil status dan hasil operasi panjang.                               | Job ID, status, progress bila tersedia, result/error aman.        | Mengembalikan queued/running/done/failed; dapat mensimulasikan timeout atau job hilang setelah restart. |

### Evidence/media dan update opsional

| API                                  | Tugas API                                                                                        | Data minimum untuk UI/mock                 | Tanggung jawab mock function                                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/media/{media_id}`       | Memberi akses browser yang terautentikasi ke image/clip atau URL bertanda tangan berumur pendek. | URL/stream metadata, content type, expiry. | Mengembalikan asset fixture lokal atau status unavailable/expired tanpa membuka storage privat.                           |
| `GET /api/v1/events` (opsional, SSE) | Mendorong update status ke client untuk mengurangi polling.                                      | Event ID/type/time/resource summary.       | Mengirim fixture event terkontrol atau koneksi terputus untuk menguji reconnect. Jika belum tersedia, UI memakai polling. |

### Konvensi response/error

- Semua endpoint mengembalikan response schema yang stabil dan timestamp berzona waktu bila timestamp tersedia.
- List endpoint mendukung filter/pagination sesuai volume data; mock harus mengimplementasikan filter tersebut, bukan selalu mengembalikan seluruh fixture.
- API mutasi mengembalikan hasil/status yang dapat ditampilkan; HTTP status menjadi penanda utama sukses/gagal.
- Error minimal memiliki kode dan pesan aman; UI memetakan validasi, not found, conflict, unauthorized/forbidden, dependency unavailable, dan unknown error secara berbeda.
- Mock harus dapat menghasilkan error yang sama untuk menguji semua UI state, tanpa memanggil service luar.

## Strategi mock dan mode development

1. Buat antarmuka client yang sama untuk backend nyata dan mock transport; komponen halaman tidak memilih data source per komponen.
2. Isi fixture dengan hubungan konsisten: VIN yang sama harus muncul pada yard, assistance, inspection, report, dan rework; scenario dan job ID juga saling terhubung.
3. Sediakan actor fixture per role dan media fixture lokal agar seluruh halaman dapat dibangun tanpa login production atau cloud storage.
4. Mock GET melakukan filter, pagination, dan not-found sesuai kontrak.
5. Mock POST/PUT mengubah state fixture in-memory sehingga setelah aksi, queue/detail mencerminkan hasilnya.
6. Sediakan skenario error deterministik: unauthorized, forbidden, invalid input, conflict, service unavailable, network timeout, media expired, dan job gagal.
7. Tunda response secara terkontrol untuk menguji loading state, namun hindari delay acak yang membuat test flaky.
8. Mode mock harus terlihat jelas di UI agar data simulasi tidak disangka data plant nyata.

## Tahapan implementasi

### Tahap 0 — Kontrak API dan identity

1. Sepakati route/schema API dari katalog ini atau petakan ke kontrak backend yang dipilih.
2. Tentukan authentication provider/session, role, dan sumber actor ID.
3. Tetapkan akses media, collection/filter/pagination, job lifecycle, serta polling/event behavior.
4. Tandai operasi yang memerlukan confirmation dialog atau role tertentu.

**Selesai bila:** tidak ada aksi produksi tanpa actor/auth semantics; setiap halaman daftar/detail memiliki API contract atau batas scope yang disepakati.

### Tahap 1 — Scaffold, shell, API client, dan mock

1. Buat aplikasi web terpisah dengan lint, typecheck, test, dan production build.
2. Implementasikan routing, app shell, responsive sidebar/topbar, theme token, status components, dan global loading/error/offline states.
3. Implementasikan API client bertipe dengan base URL konfigurasi, credential handling, timeout/cancellation, dan normalisasi error.
4. Implementasikan mock transport dan fixture konsisten untuk seluruh resource inti.
5. Tambahkan halaman koneksi backend tidak tersedia dan unknown route.

**Selesai bila:** frontend berjalan mandiri, health/readiness terbaca, seluruh halaman dapat dibuka dengan mock tanpa service luar.

### Tahap 2 — Overview, yard, dan mobil

Implementasikan overview, tabel yard/filter, detail mobil, polling/freshness, dan aksi ETA/closure/mission/hold/resume/load yang telah didukung backend.

**Selesai bila:** operator dapat menelusuri Overview → Yard → detail mobil, melakukan aksi valid, dan melihat perubahan/result dari API atau mock.

### Tahap 3 — Action center dan assistance

Implementasikan proposal queue serta assistance list/detail, opsi/risk/rekomendasi, media fallback, pilihan eksplisit, konfirmasi, actor dari sesi, dan status hasil keputusan.

**Selesai bila:** operator hanya dapat memilih opsi dari backend dan keputusan tersimpan atas actor yang terverifikasi.

### Tahap 4 — Inspection, report, dan rework

Implementasikan filter queue inspeksi, findings/checklist, report detail, bukti media, review decisions, rework bays, dan mark repair done.

**Selesai bila:** quality operator dapat membaca dasar verdict/evidence dan menelusuri rework; UI tidak dapat menyatakan PASS tanpa hasil backend.

### Tahap 5 — Test lab dan release gate

Implementasikan request-to-scenario form, job polling, scenario detail/review, adversarial result, release evaluation, dan engineer approval.

**Selesai bila:** engineer dapat mengikuti alur permintaan → job → skenario tervalidasi/dry-run → review → adversarial search → evaluasi release → approval hanya jika gate lulus.

### Tahap 6 — Hardening dan deployment

1. Uji role/action, keyboard navigation, focus state, responsive layout, accessibility, serta loading/error/offline states.
2. Tambahkan end-to-end test untuk journey assistance dan test lab dengan mock atau backend development.
3. Pastikan CORS/reverse proxy, secure token handling, content security policy, konfigurasi API, dan sanitasi konten.
4. Deploy frontend terpisah dan dokumentasikan konfigurasi serta prosedur build/deploy.

**Selesai bila:** production build dan test lulus; aksi sensitif memiliki autentikasi/otorisasi; UI menampilkan data stale/error/unavailable secara jujur; tidak ada ketergantungan langsung ke service internal selain API yang disepakati.

## Rencana pengujian

### Unit/component

- Status badge, tabel, filter, empty/loading/error state.
- Validasi/display form ETA, closure, mission, human decision, dan scenario request.
- Decision dialog tidak submit sebelum aksi explicit dan mencegah double submit.
- Evidence viewer menangani unavailable/expired tanpa mencoba membuka storage privat secara langsung.

### Integration

- Overview memuat beberapa resource tanpa request berulang yang tidak perlu.
- Assistance detail hanya menampilkan opsi dari response dan mengirim pilihan/actor yang benar.
- Job generation/search/evaluate dipoll sampai terminal state dan hasil ditampilkan.
- Semua kategori error utama ditampilkan dengan tindakan pemulihan yang sesuai.
- Mock mutation mengubah data yang terlihat pada queue/detail setelah aksi selesai.

### End-to-end journeys

1. Supervisor membuka assistance case, membaca rekomendasi/evidence, memilih salah satu opsi yang ditawarkan, konfirmasi, dan melihat case resolved.
2. Supervisor meninjau proposal rework, mengonfirmasi, dan mengikuti status repair/reinspection.
3. Engineer membuat skenario, menunggu job, membaca hasil dry-run, lalu approve/reject.
4. Engineer menjalankan adversarial search dan evaluasi release; approval ditolak jika test gagal dan tersedia hanya jika gate lulus.

## Prioritas rilis dan stop condition

Rilis pertama mencakup shell/identity, Overview, Yard/Cars, Action center/Assistance, Quality & rework, serta Test lab dasar. Halaman dapat dibatasi sesuai API yang tersedia; media/realtime penuh tidak boleh digantikan oleh data palsu.

Frontend awal selesai bila operator dapat melihat state dari API, melakukan aksi manusia dengan identity terverifikasi, menelusuri evidence saat akses aman tersedia, menjalankan alur lab/job, dan memahami kondisi stale/error/unavailable. Admin backend, editor peta, analytics historis kompleks, chatbot, dan dashboard monitoring tambahan berada di luar rilis awal.

## Risiko dan keputusan lanjutan

- **Kontrak API berubah:** bekukan schema/version sebelum banyak halaman dibuat; gunakan OpenAPI untuk menjaga tipe client dan mock tetap sinkron.
- **Akses evidence:** media penting bagi keputusan; object storage privat tidak boleh dibuka publik demi kemudahan UI.
- **Actor spoofing:** nama actor yang diketik bukan autentikasi; hubungkan actor ke identitas login dan enforcement backend.
- **Realtime:** polling cukup untuk MVP; ukur beban/latency sebelum menambahkan event stream.
- **Restart job:** jika job disimpan sementara, UI perlu menampilkan status unknown/restarted secara jujur.
- **Peta:** tampilkan diagram hanya bila API menyediakan geometri; bila hanya ada nama titik, gunakan presentasi tekstual.
- **Adaptasi ke project lain:** ganti nama resource, halaman, field, role, dan endpoint sesuai domain; pertahankan pemisahan UI/API, mock yang konsisten, dan kontrol eksplisit untuk aksi manusia.
