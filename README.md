# Marshal Control Tower — Frontend

Frontend operasional Marshal untuk supervisor, inspector, worker, dan engineer: monitoring
yard & CCTV, keputusan assistance, inspeksi & rework, serta Test Lab (skenario, adversarial
search, dan release gate).

Dibangun dengan **Bun**, **React 19 + TypeScript + Vite**, **TanStack Router**,
**TanStack Query**, **Tailwind CSS v4**, **shadcn/ui** (Radix), **Zod**, dan **Zustand**.

## Prasyarat

- [Bun](https://bun.sh) `>= 1.2` (dikembangkan dengan 1.4)

## Setup Development

```bash
bun install
bun run dev        # http://localhost:5173
```

Secara default `.env.development` mengaktifkan **mock mode** (`VITE_MOCK_MODE=true`) sehingga
seluruh halaman berjalan mandiri tanpa backend, kamera, atau simulator CARLA.

## Script

| Script | Deskripsi |
| --- | --- |
| `bun run dev` | Jalankan dev server (mock aktif) |
| `bun run build` | Typecheck (`tsc -b`) + production build ke `dist/` |
| `bun run build:mock` | Build dengan mock mode (untuk demo/preview) |
| `bun run preview` | Preview hasil build |
| `bun run test` | Unit/integration test (Vitest + RTL) |
| `bun run test:e2e` | End-to-end test (Playwright, butuh `bunx playwright install chromium`) |
| `bun run lint` | Biome lint + format check |
| `bun run check:prod` | CI guard: pastikan `VITE_MOCK_MODE` tidak `true` di env production |
| `bun run deploy` | Build mock + deploy ke Cloudflare Pages (Wrangler) |

## Environment Variables

| Variable | Contoh | Deskripsi |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Base URL API backend |
| `VITE_MOCK_MODE` | `true` / `false` | Aktifkan mock transport in-memory (dev/demo saja) |
| `VITE_APP_TITLE` | `Marshal Control Tower` | Judul aplikasi |
| `VITE_POLL_INTERVAL_MS` | `5000` | Interval polling data aktif (ms) |

> **Mock mode tidak dapat aktif di production.** `src/lib/env.ts` memaksa `MOCK_MODE=false`
> ketika `import.meta.env.PROD`, dan `bun run check:prod` mencegahnya lolos ke build.

## Arsitektur Singkat

- `src/routes/` — file-based routing TanStack Router (Overview, Yard, Cars, Actions,
  Assistance, Quality, Test Lab).
- `src/lib/api-client.ts` — HTTP client bertipe: base URL dari env, credential/cookie,
  timeout `AbortController`, normalisasi error HTTP, validasi Zod.
- `src/lib/api.ts` — lapisan endpoint bertipe (Zod schema per response).
- `src/lib/use-event-stream.ts` — SSE (`/events`) via `EventSource`, auto-reconnect;
  di mock mode memakai event simulator.
- `src/lib/mock/` — transport mock in-memory: fixtures konsisten, handler REST, job engine,
  simulator event 7 flow, dan simulator kamera canvas.
- `src/lib/stores/` — Zustand: `auth`, `app`, `event-log`, `camera`.
- `src/components/` — primitives UI (`ui/`), komponen bersama (`common/`), domain (`domain/`),
  dan layout (`layout/`).

## Aturan Keputusan Manusia

- Actor selalu berasal dari sesi (`useAuthStore`), tidak pernah dari input teks.
- Opsi assistance hanya dari backend; rekomendasi AI tidak di-pre-select.
- Aksi sensitif memerlukan konfirmasi dan di-guard role di UI (backend tetap memverifikasi).
- Media privat hanya diakses via `GET /api/v1/media/{id}`, dengan fallback bila kedaluwarsa.

## Deployment

### Cloudflare Pages (Demo / Preview, mock mode)

Lihat panduan lengkap di [`docs/deployment-cloudflare.md`](docs/deployment-cloudflare.md).
Ringkas:

```bash
VITE_MOCK_MODE=true bun run build
bunx wrangler pages deploy dist --project-name=marshal-fe
```

`public/_redirects` (`/* /index.html 200`) menangani deep-link SPA, dan `public/_headers`
mengatur security/cache header.

### Self-hosted (Nginx / Docker)

Bangun tanpa mock dan arahkan `VITE_API_BASE_URL` ke backend:

```bash
VITE_MOCK_MODE=false VITE_API_BASE_URL=https://api.example.com bun run build
```

Contoh Nginx (SPA fallback + reverse proxy API) tersedia di
[`deploy/nginx.conf`](deploy/nginx.conf). Aset ber-hash di-cache `immutable`, `index.html`
`no-cache`.

## Testing

- **Unit/component & integration** (Vitest + RTL): status badge, option radio group (tanpa
  pre-select), dialog konfirmasi (anti double-submit), evidence viewer fallback, job polling,
  dan mock transport (filter/validasi/mutasi).
- **End-to-end** (Playwright): 4 journey kritis — keputusan assistance, konfirmasi rework +
  mark done, pembuatan/review skenario, serta evaluasi release dengan approval ter-gate.
