# Marshal Control Tower — Frontend

Marshal operations frontend for supervisors, inspectors, workers, and engineers: yard & CCTV
monitoring, assistance decisions, inspections & rework, and the Test Lab (scenarios, adversarial
search, and release gate).

Built with **Bun**, **React 19 + TypeScript + Vite**, **TanStack Router**,
**TanStack Query**, **Tailwind CSS v4**, **shadcn/ui** (Radix), **Zod**, and **Zustand**.

## Prerequisites

- [Bun](https://bun.sh) `>= 1.2` (developed with 1.4)

## Development Setup

```bash
bun install
bun run dev        # http://localhost:5173
```

By default `.env.development` enables **mock mode** (`VITE_MOCK_MODE=true`) so every page runs
standalone without a backend, cameras, or the CARLA simulator.

## Scripts

| Script | Description |
| --- | --- |
| `bun run dev` | Start the dev server (mock enabled) |
| `bun run build` | Typecheck (`tsc -b`) + production build to `dist/` |
| `bun run build:mock` | Build with mock mode (for demo/preview) |
| `bun run preview` | Preview the build output |
| `bun run test` | Unit/integration tests (Vitest + RTL) |
| `bun run test:e2e` | End-to-end tests (Playwright, requires `bunx playwright install chromium`) |
| `bun run lint` | Biome lint + format check |
| `bun run check:prod` | CI guard: ensure `VITE_MOCK_MODE` is not `true` in the production env |
| `bun run deploy` | Mock build + deploy to Cloudflare Pages (Wrangler) |

## Environment Variables

| Variable | Example | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Backend API base URL |
| `VITE_MOCK_MODE` | `true` / `false` | Enable the in-memory mock transport (dev/demo only) |
| `VITE_APP_TITLE` | `Marshal Control Tower` | Application title |
| `VITE_POLL_INTERVAL_MS` | `5000` | Active data polling interval (ms) |

> **Mock mode cannot be enabled in production.** `src/lib/env.ts` forces `MOCK_MODE=false`
> when `import.meta.env.PROD`, and `bun run check:prod` prevents it from reaching a build.

## Architecture at a Glance

- `src/routes/` — TanStack Router file-based routing (Overview, Yard, Cars, Actions,
  Assistance, Quality, Test Lab).
- `src/lib/api-client.ts` — typed HTTP client: base URL from env, credentials/cookies,
  `AbortController` timeout, HTTP error normalization, Zod validation.
- `src/lib/api.ts` — typed endpoint layer (Zod schema per response).
- `src/lib/use-event-stream.ts` — SSE (`/events`) via `EventSource`, auto-reconnect;
  uses the event simulator in mock mode.
- `src/lib/mock/` — in-memory mock transport: consistent fixtures, REST handlers, job engine,
  7-flow event simulator, and canvas camera simulator.
- `src/lib/stores/` — Zustand: `auth`, `app`, `event-log`, `camera`.
- `src/components/` — UI primitives (`ui/`), shared components (`common/`), domain (`domain/`),
  and layout (`layout/`).

## Human Decision Rules

- The actor always comes from the session (`useAuthStore`), never from text input.
- Assistance options come only from the backend; AI recommendations are not pre-selected.
- Sensitive actions require confirmation and are role-guarded in the UI (the backend still verifies).
- Private media is accessed only via `GET /api/v1/media/{id}`, with a fallback when it expires.

## Deployment

### Cloudflare Pages (Demo / Preview, mock mode)

See the full guide at [`docs/deployment-cloudflare.md`](docs/deployment-cloudflare.md).
In short:

```bash
VITE_MOCK_MODE=true bun run build
bunx wrangler pages deploy dist --project-name=marshal-fe
```

`public/_redirects` (`/* /index.html 200`) handles SPA deep links, and `public/_headers`
sets security/cache headers.

### Self-hosted (Nginx / Docker)

Build without mock and point `VITE_API_BASE_URL` at the backend:

```bash
VITE_MOCK_MODE=false VITE_API_BASE_URL=https://api.example.com bun run build
```

An Nginx example (SPA fallback + API reverse proxy) is available at
[`deploy/nginx.conf`](deploy/nginx.conf). Hashed assets are cached `immutable`, `index.html`
is `no-cache`.

## Testing

- **Unit/component & integration** (Vitest + RTL): status badge, option radio group (no
  pre-select), confirmation dialog (anti double-submit), evidence viewer fallback, job polling,
  and mock transport (filter/validation/mutation).
- **End-to-end** (Playwright): 4 critical journeys — assistance decision, rework confirmation +
  mark done, scenario create/review, and release evaluation with gated approval.
