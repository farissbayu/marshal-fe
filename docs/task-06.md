# Task 06 — Hardening & Deployment

## Tujuan

Memastikan aplikasi production-ready: role/action security, aksesibilitas keyboard, responsive layout, end-to-end test journey kritis, konfigurasi CORS/CSP, secure token handling, dan deployment frontend sebagai aplikasi web terpisah.

## Techstack yang Digunakan

- **Vitest + React Testing Library** — unit/integration test komponen dan flow
- **Playwright** — end-to-end test journey kritis
- **Bun** — production build, CI scripts
- **shadcn/ui + Tailwind CSS** — responsive layout, focus state, accessibility
- **Vite** — production build configuration, env vars

---

## 1. Security & Authorization

### Checklist

**Role Guard di UI:**
- [ ] Setiap aksi sensitif dicek role dari Zustand `useAuthStore().role`:
  - `supervisor`: bisa submit assistance decision, confirm rework, proposal decision
  - `inspector`: read-only quality pages + submit inspection review
  - `worker`: mark repair done
  - `engineer`: review/approve scenario, evaluate/approve release
- [ ] Komponen aksi sensitif memeriksa permission sebelum render tombol
- [ ] Guard ini adalah UX (menyembunyikan tombol); **backend tetap wajib memverifikasi**

**Actor Identity:**
- [ ] Verifikasi: tidak ada form field untuk `actor_id` di halaman produksi
- [ ] Actor switcher (jika ada) **hanya muncul jika** `import.meta.env.MODE === 'development'`
- [ ] `VITE_MOCK_MODE=true` tidak boleh bisa diaktifkan di production build

**Token Handling:**
- [ ] Auth token (cookie/header) tidak boleh disimpan di `localStorage` tanpa enkripsi
- [ ] Rekomendasi: gunakan `httpOnly` cookie yang diatur backend — frontend tidak perlu menyentuh token
- [ ] Jika menggunakan Authorization header: ambil dari session/cookie, bukan dari URL param
- [ ] `401` response → clear session Zustand → redirect ke halaman login

**Content Security Policy:**
- [ ] Tambahkan header CSP di reverse proxy atau Vite plugin:
  - `default-src 'self'`
  - `img-src 'self' blob:` — untuk media dari API (bukan wildcard `*`)
  - `connect-src 'self' {API_BASE_URL}` — restrict ke API yang diizinkan
  - Tidak ada `unsafe-inline` untuk script

**CORS:**
- [ ] Jika menggunakan host terpisah: CORS dikonfigurasi di sisi backend (allowed origins)
- [ ] Frontend tidak pernah mengakses database, storage privat, atau service AI secara langsung
- [ ] Semua request ke API melalui `VITE_API_BASE_URL`

---

## 2. Aksesibilitas & Keyboard Navigation

### Checklist

**Keyboard Navigation:**
- [ ] Semua tombol, link, dan form dapat dijangkau dengan Tab
- [ ] Focus order logis: sidebar → main content → action panel
- [ ] Dialog/modal: focus trap saat terbuka, kembalikan focus ke trigger saat tutup
- [ ] RadioGroup assistance: navigasi dengan arrow keys
- [ ] DataTable: fokus baris dengan Enter untuk membuka detail

**Focus State:**
- [ ] Semua elemen interaktif memiliki visible focus ring (jangan `outline: none` tanpa alternatif)
- [ ] Focus ring kontras tinggi sesuai theme manufaktur

**ARIA Labels:**
- [ ] `aria-label` untuk tombol icon-only (misalnya tombol refresh)
- [ ] `aria-live="polite"` untuk notifikasi status (loading → sukses → error)
- [ ] `role="status"` untuk loading state area
- [ ] `aria-busy="true"` saat data sedang dimuat

**Reduced Motion:**
- [ ] `@media (prefers-reduced-motion: reduce)`: nonaktifkan semua animasi/transisi
- [ ] Spinner boleh tetap berjalan tapi tanpa efek bounce/flash

**Color Accessibility:**
- [ ] Status (PASS/FAIL/REVIEW) tidak hanya dibedakan warna — sertakan label teks dan/atau icon
- [ ] Contrast ratio ≥ 4.5:1 untuk teks normal, ≥ 3:1 untuk teks besar/UI elements

---

## 3. Responsive Layout

### Checklist

**Breakpoints (Tailwind):**
- [ ] `sm` (640px+): layout satu kolom, sidebar collapsed menjadi bottom nav atau hamburger
- [ ] `md` (768px+): sidebar visible tapi compact, tabel dengan scroll horizontal
- [ ] `lg` (1024px+): layout dua kolom (tabel + panel truck), sidebar full
- [ ] `xl` (1280px+): layout workstation control tower — informasi penuh, multi-panel

**Tabel Responsif:**
- [ ] Pada layar kecil: horizontal scroll atau column hiding (kolom opsional disembunyikan)
- [ ] Kolom prioritas: VIN, Status, Aksi — selalu tampil

**Dialog & Panel:**
- [ ] Dialog fullscreen pada mobile
- [ ] Slide-over panel menjadi bottom sheet pada mobile

**Evidence Viewer:**
- [ ] Image tetap dalam bounds container — tidak overflow
- [ ] Pada mobile: image click untuk fullscreen view

---

## 4. Loading, Error & Offline States

### Checklist

**Loading States:**
- [ ] Setiap halaman menggunakan Skeleton loader (bukan spinner kosong)
- [ ] Tabel: skeleton rows
- [ ] KPI cards: skeleton card
- [ ] Evidence image: skeleton image dengan aspect ratio

**Error States:**
- [ ] Error panel per section — tidak hanya global toast
- [ ] Tombol retry pada setiap error panel
- [ ] Error message sesuai kode HTTP (lihat konvensi di Task 01)
- [ ] Error 503 (dependency unavailable): tampilkan nama dependency yang gagal jika tersedia

**Empty States:**
- [ ] Setiap daftar punya empty state dengan pesan kontekstual:
  - Queue assistance kosong: "Tidak ada assistance case terbuka"
  - Tabel car kosong dengan filter: "Tidak ada mobil yang cocok dengan filter ini"
  - Test requests kosong: "Belum ada test request"

**Offline State:**
- [ ] Banner offline saat `navigator.onLine === false`
- [ ] Banner hilang otomatis saat koneksi kembali
- [ ] Polling berhenti saat offline, resume saat kembali online

---

## 5. Testing

### Unit / Component Tests (Vitest + RTL)

- [ ] `StatusBadge` — render warna dan label yang benar per status
- [ ] `FilterBar` — perubahan filter memanggil callback dengan nilai yang benar
- [ ] `OptionRadioGroup` — tidak ada opsi di-pre-select, submit disabled sebelum pilih
- [ ] `DecisionDialog` — tidak submit sebelum user konfirmasi, cegah double submit
- [ ] `EvidenceViewer` — tampilkan placeholder jika media unavailable/expired
- [ ] `JobStatusPanel` — polling dimulai untuk status running, berhenti untuk terminal state
- [ ] `ApproveReleaseButton` — disabled jika gate tidak lulus, tidak render untuk non-engineer

### Integration Tests (Vitest + Mock)

- [ ] Overview memuat KPI + assistance + proposals tanpa request duplikat yang tidak perlu
- [ ] Assistance detail menampilkan opsi dari response dan mengirim pilihan + actor_id yang benar
- [ ] Submit proposal decision → tampilkan hasil + invalidate list
- [ ] Job polling (adversarial/evaluate) berjalan sampai terminal state dan menampilkan hasil
- [ ] Semua kategori error HTTP (401, 403, 404, 409, 422, 503) ditampilkan dengan recovery action
- [ ] Mock mutation mengubah data yang terlihat di queue/detail setelah aksi selesai

### End-to-End Tests (Playwright)

Setup:
```bash
bun add -D @playwright/test
bunx playwright install
```

Journey yang wajib ditest:

**Journey 1: Assistance Decision**
```
1. Login sebagai supervisor
2. Buka /assistance
3. Klik case dengan indikator risiko (orang dekat)
4. Verifikasi: rekomendasi AI tidak di-pre-select
5. Pilih satu opsi dari RadioGroup
6. Klik submit → dialog konfirmasi muncul
7. Konfirmasi → verifikasi case resolved
8. Verifikasi: pilihan, resolved_by, dan waktu tampil
```

**Journey 2: Rework Confirmation**
```
1. Login sebagai supervisor
2. Buka /quality/rework
3. Pilih VIN dengan status FAIL
4. Buka detail report
5. Klik "Konfirmasi Rework"
6. Submit → verifikasi status berubah ke IN_REPAIR
7. Login sebagai worker
8. Mark repair done
9. Verifikasi status WAITING REINSPECTION
```

**Journey 3: Scenario Creation (Engineer)**
```
1. Login sebagai engineer
2. Buka /lab?tab=requests
3. Isi form deskripsi dan submit
4. Verifikasi: notifikasi job berjalan muncul
5. Poll sampai job selesai
6. Verifikasi: link ke scenario terbuat
7. Buka scenario → verifikasi spec read-only dan dry-run metrics
8. Submit review: approve
```

**Journey 4: Release Evaluation & Approval**
```
1. Login sebagai engineer
2. Buka /lab?tab=releases
3. Pilih release dengan gate BLOCKED
4. Klik Evaluate → verifikasi job polling
5. Verifikasi: tombol Approve tidak tersedia saat gate BLOCKED
6. Pilih release dengan gate PASS
7. Klik Evaluate → tunggu selesai → gate PASS
8. Tombol Approve muncul → klik → konfirmasi → verifikasi approved
```

---

## 6. Production Build & Deployment

### Checklist

**Environment Variables:**
```env
# .env.production
VITE_API_BASE_URL=https://api.marshal-ops.example.com
VITE_MOCK_MODE=false  # HARUS false di production
```

- [ ] Semua env vars yang dibutuhkan terdokumentasi di `README.md`
- [ ] Tidak ada API key, token, atau credential yang hard-coded
- [ ] `VITE_MOCK_MODE=true` tidak boleh lolos ke production build (tambahkan CI check)

**Build:**
```bash
bun run build
```

- [ ] Build sukses tanpa TypeScript error
- [ ] Build sukses tanpa Zod validation warning
- [ ] Bundle size dianalisis: `bun run build --mode analyze` atau vite-bundle-visualizer

**Hosting Target:**
- [ ] **Cloudflare Pages (Mock Demo / Preview Deployment)**: Ikuti panduan lengkap di [`deployment-cloudflare.md`](./deployment-cloudflare.md) menggunakan fallback `public/_redirects` (`/* /index.html 200`) dan direct upload via Wrangler atau Git integration.
- [ ] **Production Self-Hosted (Nginx / Docker)**:
  - SPA routing: semua request non-asset diarahkan ke `index.html`
  ```nginx
  location / {
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    proxy_pass http://backend:8000;
  }
  ```
- [ ] Gzip/Brotli compression untuk assets
- [ ] Cache headers: assets (JS/CSS dengan hash) → `max-age=31536000`, `index.html` → `no-cache`

**Dokumentasi Deploy:**
- [ ] `README.md` berisi:
  - Prerequisites (Bun version)
  - Development setup (`bun install && bun dev`)
  - Production build (`bun run build`)
  - Environment variables yang dibutuhkan
  - Deploy instructions (Docker/Nginx/platform)
  - Mock mode instructions (dev only)

---

## Definition of Done (Final)

- [ ] `bun run build` sukses — tidak ada TypeScript error, tidak ada warning kritis
- [ ] `bun run test` (Vitest) lulus semua unit dan integration test
- [ ] `bunx playwright test` lulus semua 4 journey end-to-end
- [ ] Semua aksi sensitif memiliki autentikasi/otorisasi (guard role di UI + verifikasi backend)
- [ ] `VITE_MOCK_MODE=false` di production; mock mode tidak bisa diaktifkan secara diam-diam
- [ ] UI menampilkan data stale/error/unavailable secara jujur — tidak ada data palsu
- [ ] Tidak ada ketergantungan langsung ke service internal selain API yang disepakati
- [ ] Keyboard navigation dan aksesibilitas lulus audit dasar
- [ ] Responsive layout berfungsi di workstation (1280px+), tablet (768px+), dan mobile (360px+)
- [ ] Dokumentasi build/deploy tersedia dan akurat

