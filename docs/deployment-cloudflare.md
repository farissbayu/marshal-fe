# Panduan Deployment Cloudflare Pages (Mock Mode)

## 1. Ringkasan & Tujuan

Dokumen ini menjelaskan prosedur deployment aplikasi **Marshal Frontend** ke **Cloudflare Pages** dalam mode **Standalone Demo / Mock Data**. 

Dengan konfigurasi ini, seluruh antarmuka operasional (Control Tower, CCTV live simulation, Realtime Flow SSE simulation, Yard, Assistance, Quality, dan Test Lab) dapat diakses publik sebagai preview/demo tanpa memerlukan koneksi langsung ke backend nyata ataupun simulator CARLA.

---

## 2. Karakteristik Build Mock Mode

- **Build Output**: Static Single-Page Application (SPA) di folder `dist/`.
- **In-Memory Mock Transport**: Seluruh panggilan REST (`api-client.ts`) dialihkan ke fixture lokal in-memory.
- **Simulasi Live CCTV**: Komponen `<PlantCameraFeed />` berjalan dalam mode simulasi (canvas animasi atau rotasi snapshot visual) tanpa error 503.
- **Simulasi Live SSE**: Generator `event-simulator.ts` memancarkan stream event secara periodik di sisi browser untuk mensimulasikan aktivitas 7 Flow AI secara nyata.
- **Visual Badge**: Banner *"MOCK MODE / PREVIEW"* ditampilkan di top bar untuk transparansi bahwa aplikasi sedang berjalan dengan data simulasi.

---

## 3. Konfigurasi Khusus Cloudflare Pages

### A. SPA Routing Fallback (`public/_redirects`)

TanStack Router menggunakan HTML5 History API (`pushState`). Agar deep link (contoh: `/cars/VIN-001`, `/assistance/case-01`, `/lab?tab=releases`) tidak menghasilkan error **404 Not Found** saat halaman di-refresh, buat file `public/_redirects`:

```text
/*    /index.html   200
```

> **Catatan**: File di dalam folder `public/` akan otomatis disalin ke root folder `dist/` saat proses `bun run build`.

---

### B. Security & Cache Headers (`public/_headers`)

Tambahkan file `public/_headers` untuk memastikan keamanan level industri dan manajemen cache aset optimal di jaringan edge Cloudflare:

```text
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# Cache hashing untuk file bundle statis Vite
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# Pastikan index.html tidak di-cache permanen agar update selalu terbaca
/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

---

## 4. Environment Variables

Atur Environment Variables di dashboard Cloudflare Pages (atau file `.env.production`):

| Variable | Nilai | Deskripsi |
|---|---|---|
| `VITE_MOCK_MODE` | `true` | **Wajib**. Mengaktifkan in-memory mock handlers & simulator |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL lokal (ditangani oleh mock interceptor) |
| `VITE_APP_TITLE` | `Marshal Control Tower (Demo)` | Judul aplikasi di browser |

---

## 5. Prosedur Deployment

Ada dua metode utama untuk mendeploy ke Cloudflare Pages:

### Metode 1: Git Integration (Otomatis via GitHub / GitLab) - *Direkomendasikan*

1. Masuk ke dashboard [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Workers & Pages**.
2. Klik **Create application** > tab **Pages** > **Connect to Git**.
3. Pilih repository `marshal-fe`.
4. Isi **Build settings**:
   - **Framework preset**: `Vite`
   - **Build command**: `bun run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/` (atau sesuaikan jika monorepo)
5. Buka bagian **Environment variables (advanced)** dan tambahkan:
   - `BUN_VERSION`: `1.2.0` (atau versi Bun terbaru)
   - `VITE_MOCK_MODE`: `true`
6. Klik **Save and Deploy**. Cloudflare akan mengompilasi dan menyediakan URL publik (`https://marshal-fe.pages.dev`).

---

### Metode 2: Direct Upload via Wrangler CLI (Deployment Cepat dari Terminal)

Jika ingin mendeploy langsung dari komputer lokal menggunakan Bun:

1. Install Wrangler jika belum ada:
   ```bash
   bun add -D wrangler
   ```

2. Jalankan build lokal:
   ```bash
   # Pastikan environment variable mock aktif saat build
   VITE_MOCK_MODE=true bun run build
   ```

3. Login ke Cloudflare (hanya pertama kali):
   ```bash
   bunx wrangler login
   ```

4. Deploy folder `dist`:
   ```bash
   bunx wrangler pages deploy dist --project-name=marshal-fe
   ```

5. Wrangler akan mencetak URL staging / production instan di terminal.

---

## 6. Package.json Script Reference

Tambahkan script pendukung deployment ke file `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "build:mock": "VITE_MOCK_MODE=true vite build",
    "preview": "vite preview",
    "deploy": "bun run build:mock && bunx wrangler pages deploy dist --project-name=marshal-fe"
  }
}
```

---

## 7. Checklist Verifikasi Pasca-Deployment

Setelah URL Cloudflare Pages aktif, lakukan pengujian berikut di browser:

- [ ] **Home & App Shell**: Halaman utama `/overview` terbuka tanpa blank screen atau crash console.
- [ ] **Mock Banner**: Indikator "MOCK MODE" muncul di top bar.
- [ ] **SPA Direct Link**: Buka URL langsung ke `/yard`, `/cars`, `/assistance`, atau `/lab` lalu refresh halaman (F5) — verifikasi tidak terjadi 404 Cloudflare.
- [ ] **Live CCTV Simulator**: Panel Plant CCTV di Overview menampilkan preview visual simulasi (tidak pecah/blank).
- [ ] **Realtime Event Feed**: Panel Log Aktivitas SSE memunculkan update baris log otomatis secara periodik.
- [ ] **Interaksi Aksi**:
  - Buka `/assistance`, pilih opsi pada kasus terbuka, klik submit → konfirmasi berhasil dan status berubah jadi resolved.
  - Buka `/actions`, coba setujui/tolak proposal re-plan → list terupdate.
- [ ] **Aksesibilitas & Responsive**: Uji tampilan pada ukuran layar desktop workstation dan tablet.

