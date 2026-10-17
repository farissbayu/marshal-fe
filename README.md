# Marshal Three.js

Plant car simulation **without CARLA**, entirely in the browser with **three.js**. An operator
picks how many cars to process, the system runs one batch through **7 flows**, records an event
log, and **Gemini (ADK)** gives per-batch feedback and a report.

## Rule #1 — standalone

> **This project is standalone.** It must not integrate with `marshal-ai` (Python) or
> `marshal-fe` (React): no cross-folder imports, no shared package, no HTTP call to those
> projects. Every concept (plant map, flows, batch, report) is a self-contained TypeScript copy
> living in this folder. Enforced by `scripts/check-standalone.mjs` (`bun run check:standalone`).

## Quickstart (offline, no key needed)

```bash
bun install
bun dev
# open http://localhost:3000, enter 3 cars, click Run batch
```

Without a Gemini key everything still works: every AI answer is the deterministic offline one
and the UI/report show a **degraded** badge. A 3-car batch finishes in a few seconds.

## Turning on Gemini (optional)

Provide an API key, or use Vertex:

```bash
cp .env.example .env
# then set ONE of:
#   GOOGLE_GENAI_API_KEY=your-key
#   GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION
# Optional: GEMINI_MODEL (default gemini-2.5-flash)
```

The key is read **only** in `src/ai/server.ts` and never reaches the browser bundle. With a key
the same flows run, but verdicts/feedback come from the model; on any error or timeout the flow
silently falls back to the offline answer and the batch keeps going.

## Verify

```bash
bun run verify        # lint + typecheck + check:standalone + unit tests + build
```

## Folder map

```text
src/sim/      deterministic simulation core (pure TS, no three/React)
  flows/      flows 1-5 (yard, assistance, visual, functional, report)
  lab/        flows 6-7 (scenario generator, adversarial tester)
  batch/      manifest, orchestrator, counts, feedback, report
src/render/   three.js scene + offscreen capture -> JPEG
src/ai/       ADK agents + server function aiTask() + offline handlers
src/ui/       dashboard components
src/stores/   zustand batch store
src/lib/      small utils (colours, storage)
```

See `docs/ARCHITECTURE.md` for the data flow and `docs/DEMO.md` for a 5-minute demo script.

## Honest limitations

- The simulation runs in the browser tab (`ssr: false` on the dashboard route). **Closing the
  tab stops the batch.** Accepted for a demo.
- Kinematics only — cars move in straight lines between points. **No realistic physics.**
- Generated faults are limited to `wrong_colour`, `dead_lamp` and the box+worker `incident`.
  Clean cars are clean. Not a production facility model.
- Visual defects (scratches/dents) are not generated, so `visual.defects` returns none offline.
- `three@0.186` ships no type declarations; `src/render/three.d.ts` is a local shim.
