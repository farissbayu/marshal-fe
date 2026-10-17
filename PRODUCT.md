# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The demo operator — usually the developer or sales engineer who drives the dashboard live, in
front of stakeholders or client evaluators of the marshal concept. Their job: run one batch of
cars through all 7 flows, show the AI feedback and report, and answer questions on the spot.
The watching stakeholders are the audience, not the hands on the keyboard.

## Product Purpose

Recreate a car-plant processing simulation entirely in the browser: a batch of cars moves from
line end through inspection gate, test track, report, and yard to shipped, with remote
assistance when blocked, plus a scenario generator and adversarial tester when an incident
occurred. It exists so the marshal 7-flow concept can be demonstrated live without CARLA, any
Python service, or a GPU server. Success is a convincing live demo: one batch visibly walks all
7 flows in minutes, with real Gemini feedback, and works offline with deterministic answers
plus a `degraded` badge when no key is present.

## Positioning

A browser-tab plant simulation with zero installation beyond `bun dev` (no CARLA, no headless
browser at runtime), where the same WebGL scene feeds both the operator's viewer and the vision
capture Gemini sees — so what the model judges is exactly what the operator sees. A neighboring
product running a server-backed simulator or headless capture could not truthfully copy both
claims at once.

## Operating Context

- Follows the 5-minute demo script in `docs/DEMO.md` (offline first, key added only for the
  final comparison step).
- One active batch of 1–6 cars at a time; a second batch is rejected while one is running.
- Default operation is offline: `bun dev`, no key, deterministic answers everywhere. Setting
  `GOOGLE_GENAI_API_KEY` (or Vertex env vars) upgrades judgement to real Gemini. The key is read
  only in `src/ai/server.ts` and never reaches the client bundle.
- The operator uses the viewer cameras (overview / follow / gate / track), Pause, and 1×–8×
  speed; supervisor decisions (`manual_override`, `reroute`) are made on the Assistance card
  during the run.
- Batches are recorded in memory + localStorage and exportable as JSON; there is no database.
- Verification runs offline: `bun run verify`.

## Capabilities and Constraints

- Batch status contract: `queued → running → done | failed | cancelled`;
  `progress = finished_cars / requested_cars * 100`, finished = shipped, parked, or reworked.
- Flows 1–5 run for every batch; flows 6–7 (scenario generator, adversarial tester) run only
  when the batch had an incident, otherwise their counts are `not_triggered`.
- Injected faults are limited to `wrong_colour` (N≥2), `dead_lamp` (N≥3, failing the
  `headlights`/`brake_lights` steps) and a box+worker `incident` (N≥3); remaining cars are
  `clean`.
- AI runs server-side through ADK (`@google/adk`) behind the `aiTask()` server function, default
  model `gemini-2.5-flash`; any error or timeout silently falls back to the deterministic
  offline answer and the batch keeps going.
- Vision capture renders to an offscreen renderer from the same WebGL scene (gate: 4 views;
  track: per step) as JPEG base64; no headless browser is used at runtime.
- Simulation is client-side in one tab: fixed-step 0.1 s, seeded RNG (replay needs only the
  seed), kinematic motion in straight lines — no realistic physics.
- `src/sim` is pure TypeScript (no three/React/SDK imports, Biome-enforced); AI and capture are
  injected via ports.
- Demoted-to-demo limitations accepted and documented: closing the tab stops the batch; visual
  defects (scratches/dents) are not generated, so `visual.defects` returns none offline;
  `three@0.186` has no bundled types (`src/render/three.d.ts` is a local shim).
- Ongoing constraint chosen to preserve: standalone Rule #1 — no cross-folder imports, shared
  package, or HTTP calls to `marshal-ai`/`marshal-fe`; enforced by `bun run check:standalone`.
- Ongoing constraint chosen to preserve: the 7-flow + report contract — 7 per-flow feedback
  entries, expected-vs-actual label outcomes, KPI counts computed in TypeScript.
- Ongoing constraint chosen to preserve: demo-scale constraints (1–6 cars, one batch, tab-bound)
  documented as honest limitations rather than solved.

## Evidence on Hand

- `docs/DEMO.md` — the 5-minute demo script, all steps offline-capable.
- `docs/ARCHITECTURE.md` — data flow, status contract, design decisions, known shortcuts.
- `tasks/T01–T18` + `tasks/README.md` — locked decisions table and global Definition of Done.
- Unit tests for sim/AI/render.
- No real plant data, customers, testimonials, benchmarks, or press exist; future work must not
  fabricate them.

## Product Principles

1. The live demo is the acceptance test: if a change endangers the 5-minute walkthrough, it
   does not ship.
2. Offline-first is the floor: every flow must complete with no API key; the key only upgrades
   feedback quality.
3. What the operator sees is what Gemini sees — never let the viewer and the capture diverge.
4. Determinism is a feature: seeded RNG and fixed-step so any batch can be replayed on stage.
5. Judgement that must be trustworthy (safety rules, KPI counts, adversarial verdicts) lives in
   code, not in the model.
