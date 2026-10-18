# Architecture

## Shape

```text
Browser (one tab)
├─ src/sim/      deterministic engine + flows (pure TypeScript)
│   engine/vehicle  fixed-step 0.1s, kinematic motion over the world map, seeded RNG
│   flows/          flow 1-5: yard, assistance, visual, functional, report
│   lab/            flow 6-7: scenario generator, adversarial tester
│   batch/          manifest + labels, orchestrator (state machine), counts, feedback, report
├─ src/render/   three.js scene + offscreen capture (gate 4 views, track per step) -> JPEG
├─ src/ui/       dashboard components (React)
└─ src/stores/   zustand batch store; drives the engine loop via requestAnimationFrame

Server (TanStack Start server function)
└─ src/ai/       ADK agents + aiTask() server function -> Gemini
                 (offline only when VITE_AI_OFFLINE=true; otherwise errors surface)
```

## Data flow

1. Operator picks 1–6 cars → `planBatch()` picks cases from the 20-case library (Gemini
   `batch.plan` when a key is set, validated in code; seeded sample otherwise) → `BatchRunner`
   builds a deterministic `Manifest` (`VIN-B0x-n`, build sheet, colour, truck, expected label +
   case id; at most one incident).
2. The runner steps a `SimEngine` at a fixed 0.1 s and drives each car through the flows:
   line end → inspection gate → test track → report → yard → shipped, with flows 1–5 active.
3. Whenever judgement is needed, the flow asks the injected `AiTaskFn` (client wrapper). Media
   frames come from the injected `CapturePort`. The engine never imports three.js or React.
4. Events become `BatchEvent`s (`flow`, `source`, `title`, `detail`, `level`, `payload`).
5. If the batch had an incident, flows 6–7 run after all cars finish; otherwise their counts are
   `not_triggered`.
6. `buildReport()` assembles KPI counts (computed in TypeScript), label outcomes, the Gemini
   `BatchFeedback` (7 per-flow entries) and the event log. The dashboard stops updating once the
   status is terminal.

## Batch status contract

```text
queued → running → done
                 ↘ failed
                 ↘ cancelled

progress = finished_cars / requested_cars * 100
finished = car shipped, parked in yard, or done reworking
```

## Important design decisions

- **Client-side simulation.** Vision capture needs no headless browser, the viewer runs at 60 fps
  from the same state, and replay only needs the seed. Consequence: closing the tab stops the
  batch (accepted for the demo). The dashboard route is client-rendered (`ssr: false`)
  because the SSR dev-hydration path in this TanStack Start/Vite combination does not attach
  event handlers; the app is client-side by design so this costs nothing.
- **Gemini forced by default, offline by explicit switch.** Every task in `src/ai/tasks.ts` has
  a handler in `src/ai/offline.ts`, used only when `VITE_AI_OFFLINE=true` is set in `.env`.
  Otherwise a missing key or model failure is returned as an error and the client throws, so the
  store fails the batch loudly (`Batch failed`) instead of degrading silently. The key is read
  only in `src/ai/server.ts`. A flow awaits the AI promise but the engine tick is not stopped by
  a single call (offline it is effectively instant).
- **Vision from the same WebGL scene.** `src/render/capture.ts` renders to an offscreen renderer
  separate from the viewer canvas, so what Gemini sees matches what the operator sees.
- **Injectable ports keep `src/sim` pure.** `AiTaskFn` (`src/ai/tasks.ts`) and `CapturePort`
  (`src/sim/ports.ts`) are injected by the runner/store, so the simulation has no three/React/SDK
  imports (enforced by a Biome rule) and is fully testable with `offlineAi` + `truthCapture`.
- **Safety rules live in code, not the model.** `wait_for_removal` is only offered when a person
  is present; the adversarial judge decides pass/fail from metrics; KPI numbers are computed in TS.

## Known shortcuts

- AI latency pauses the tick (the runner awaits per car). Offline this is negligible; upgrade by
  running car AI in parallel if a live key makes batches visibly stall.
- Headless batches auto-decide an open assistance case after 90 simulated seconds so an
  unattended batch never hangs; the UI can decide earlier.
- `three@0.186` has no bundled types, so `src/render/three.d.ts` is a loose local shim.
