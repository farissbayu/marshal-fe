# Faris's Task Breakdown — Marshal Three.js

> **Source:** Extracted from [`TEAM_PLAN.md`](file:///home/farissbayu/projects/marshal/marshal-threejs/TEAM_PLAN.md)  
> **Role:** Simulator & 3D Engine Lead (**Faris**)  
> **Primary Ownership:** Three.js plant engine — world geometry, roads, car actors, kinematics & driving AI, camera rendering, R-12 routine, obstacle detection, and canvas integration.  
> **Collaborator:** Qais (Marshal orchestrator, TanStack Server Functions / Gemini, Dashboard UI).

---

## 1. Summary of Ownership & Interfaces

### Primary Responsibility
- **3D World & Assets:** Procedural roads, named-point map, plant dressings (fences, props, parked vehicles).
- **Vehicle Simulation & Kinematics:** Kinematic bicycle model, pure-pursuit steering, speed controller, arrival & queuing logic.
- **Vision & Cameras:** Gate inspection cameras (4x WebGL render targets), on-board vehicle cameras (chase, front/rear evidence), base64 JPEG offscreen capture pipeline.
- **R-12 Test Track & Fault Injection:** 6-step testing routine, light fault injection (`headlights`, `brake_lights`, `indicators`), repair flow.
- **Safety & Obstacle System:** Dynamic obstacle scanning, blocked detection, assist incident triggers, assist maneuvers (`wait`, `pass_left`, `reroute`).
- **Canvas Integration:** Three.js overlay canvas (`SimCanvas.tsx`) embedded into dashboard with chase view, top-down mini-map, and orchestrator notes.

### Shared Integration Points with Qais
- **`src/lib/marshal/types.ts`:** Review and align on TypeScript contracts (`SimCommand`, `SimEvent`, `DrivingSystem`) before M2 begins.
- **M3 (Gate Flow):** Faris delivers `GateCamera.capture()`; Qais delivers `evaluateGatePhotos()`.
- **M5 (Lamp Flow):** Faris delivers front/rear evidence camera capture + R-12 routine; Qais delivers `evaluateLampEvidence()`.
- **M6 (Assist Flow):** Faris delivers obstacle detection + assist clip buffer + maneuver execution; Qais delivers `analyzeAssistClip()`.
- **M7 (Parking Flow):** Faris delivers per-tick bicycle model control loop + obstacle box telemetry; Qais delivers A* planner + `planParkingStep()`.
- **M8 (Dashboard):** Qais delivers React UI; Faris hooks up `SimCanvas.tsx`.

---

## 2. Target File Structure (Faris's Domain)

```
src/
├── components/
│   └── SimCanvas.tsx             # Three.js canvas (chase view + top-down inset + notes)
└── lib/
    ├── marshal/
    │   └── types.ts              # Contract review & implementation alignment
    └── simulator/
        ├── engine.ts             # ThreeJsBackend (implements DrivingSystem)
        ├── coords.ts             # CARLA ↔ Three.js coordinate conversion
        ├── world/
        │   ├── plantMap.ts       # 20+ named points, lane segment graph
        │   ├── roadBuilder.ts    # Procedural lane polylines (sampled every 1m)
        │   └── dress.ts          # Fence, yard cars, trucks, props, gate boards
        ├── actors/
        │   ├── car.ts            # Car mesh, emissive light materials, fault overrides
        │   ├── driver.ts         # Autonomous driver (pure-pursuit, queuing, pull-over)
        │   ├── routine.ts        # R-12 routine execution & step telemetry
        │   └── props.ts          # Box, worker, cone, barrel, truck meshes
        └── cameras/
            ├── gateCamera.ts     # 4 inspection_gate WebGLRenderTarget cameras
            └── carCamera.ts      # On-board: assist (chase) & front/rear evidence
```

---

## 3. Detailed Milestone Tasks

### Milestone 1 — Static Plant World
**Goal:** Plant environment rendered in Three.js; camera screenshot at gate matches reference layout.

> Implemented in `src/lib/simulator/`: `coords.ts`, `world/plantMap.ts` (lane graph), `world/roadBuilder.ts`,
> `world/dress.ts`, `world/lighting.ts`, `actors/car.ts`. Deviations: the loose three type shim is kept
> instead of `@types/three` (see docs/ARCHITECTURE.md known shortcuts); lane legs are straight until the
> CARLA map YAML lands; named points come from `src/lib/marshal/points.ts` so they cannot drift from the
> TEAM_PLAN table.

- [x] **M1.1 Set up project dependencies**
  - Verify Three.js (`three`, `@types/three`), TypeScript strict configuration, and project tooling.
- [x] **M1.2 Implement coordinate conversion (`src/lib/simulator/coords.ts`)**
  - CARLA (left-handed, Z-up) to Three.js (right-handed, Y-up):
    ```ts
    mesh.position.set(x, z, y);
    mesh.rotation.y = -THREE.MathUtils.degToRad(yawDeg);
    ```
- [x] **M1.3 Build procedural road geometry (`src/lib/simulator/world/roadBuilder.ts`)**
  - 8 roads (4 straights + 4 quarter-bends, $r=22\text{m}$), Lane C connector.
  - Lane $-2$ centre-line polylines sampled at $1\text{m}$ intervals.
- [x] **M1.4 Build named point map & segment graph (`src/lib/simulator/world/plantMap.ts`)**
  - Define all 20+ named points from YAML specification (`line_end`, `buffer_zone_b`, `inspection_gate`, `test_track`, `report_point`, `lane_c`, `finishing`, `rework.electrical`, `yard.entry`, `yard.Y1–Y8`, etc.).
  - Build topological segment graph for route validation and path planning.
- [x] **M1.5 Dress the plant (`src/lib/simulator/world/dress.ts`)**
  - Perimeter security fence (barrier module every $4\text{m}$).
  - Parked cars in yard (Road 7, Lane $-5$, spaced every $6\text{m}$).
  - Loading bay trucks (Road 5 inner apron, spaced every $13\text{m}$).
  - Storage compound rows (inner loop).
  - Gate calibration boards, safety cones, warning signage.
  - Rework bay props: barrels, boxes, iron plank, defect sign.
- [x] **M1.6 Car model with controllable light states (`src/lib/simulator/actors/car.ts`)**
  - Dimensions: Length $4.9\text{m}$, Width $1.9\text{m}$, Wheelbase $2.85\text{m}$.
  - Emissive light materials for:
    - LowBeam (front headlights pair)
    - Brake (rear light bar)
    - Reverse (rear white lights)
    - LeftBlinker & RightBlinker (amber turn indicators)
  - Fault override support: e.g. `setFault('headlights')` disables visual emissive mesh while vehicle telemetry still reports `"ON"`.
- [x] **M1.7 Lighting & Atmosphere**
  - Dusk atmospheric illumination: Sun/ambient light with low elevation angle ($15^\circ$).

---

### Milestone 2 — Lane Graph + One Car Driving
**Goal:** Single car drives autonomous loop: `line_end → inspection_gate → test_track → report_point` at $10\text{ km/h}$, crossing gate at $\sim 5\text{ km/h}$.

- [ ] **M2.1 Lane graph pathfinding**
  - Path search (A* or Dijkstra) traversing the segment graph between waypoints.
- [ ] **M2.2 Pure-pursuit steering controller (`src/lib/simulator/actors/driver.ts`)**
  - Lookahead distance: $\sim 2\times$ car length ($\approx 9.8\text{m}$).
  - Maximum steering angle: $\pm 30^\circ$ front-wheel deflection.
  - Kinematic bicycle model ($L = 2.85\text{m}$).
- [ ] **M2.3 Speed controller**
  - Smooth acceleration/braking profile targeting `max_speed_kmh` (default $10\text{ km/h}$).
- [ ] **M2.4 Arrival & stop detection**
  - **Normal waypoint:** arrival radius within $3\text{--}4\text{m}$.
  - **Precise stop (`pull_over`, rework):** tolerance $\pm 0.4\text{m}$, walking creep speed, $30\text{s}$ timeout.
  - **Drive-through (`inspection_gate`):** seamless crossing without stopping, log gate speed `passes[vin] = km/h`, emit status.
- [ ] **M2.5 Event dispatchers**
  - Emit periodic `status` event at $1\text{ Hz}$.
  - Emit `mission.done` on completing all waypoint segments.
- [ ] **M2.6 Implement `send(MissionGoCmd)` dispatcher (`src/lib/simulator/engine.ts`)**
  - Parse waypoints, assign path, and activate driver state machine.

---

### Milestone 3 — Gate Inspection Cameras (Simulator Side)
**Goal:** 4 fixed inspection cameras render car drive-through and export clean base64 frames to gate flow.

- [ ] **M3.1 Gate camera rig implementation (`src/lib/simulator/cameras/gateCamera.ts`)**
  - 4 `WebGLRenderTarget` cameras positioned around `inspection_gate`:
    - **Front:** Forward $+7\text{m}$, Z $1.5\text{m}$, Yaw $180^\circ$, Pitch $-5^\circ$, FOV $90^\circ$
    - **Rear:** Forward $-7\text{m}$, Z $1.5\text{m}$, Yaw $0^\circ$, Pitch $-5^\circ$, FOV $90^\circ$
    - **Left:** Right $-5\text{m}$, Z $1.2\text{m}$, Yaw $+90^\circ$, Pitch $-5^\circ$, FOV $90^\circ$
    - **Right:** Right $+5\text{m}$, Z $1.2\text{m}$, Yaw $-90^\circ$, Pitch $-5^\circ$, FOV $90^\circ$
  - Drive-through trigger: capture fired when vehicle bounding centre crosses the gate threshold.
  - Resolution: $1280 \times 720$, raw JPEG export without text overlays or debug UI.
- [ ] **M3.2 Implement `GateCamera.capture(vin, views)`**
  - Returns `{ front, rear, left, right }` as clean base64 JPEG strings for Gemini consumption.
- [ ] **M3.3 Integration testing with Qais**
  - Validate handshake between camera capture and `evaluateGatePhotos()`.

---

### Milestone 4 — Multi-Car Queuing, Pull-Over & Yard Slots
**Goal:** 4 cars operate simultaneously without deadlocks; pull-over and yard repositioning succeed.

- [ ] **M4.1 Multi-car vehicle queuing**
  - Minimum following gap: $6\text{m}$ when stationary, proportional distance when rolling.
  - Queuing classification: waiting behind another active plant vehicle counts as normal queue (must **not** trigger assist request).
  - Shoulder tolerance: ignore vehicles stopped at `pull_over` shoulder points.
- [ ] **M4.2 Pull-over maneuver sequence**
  1. Navigate driving lane until $12\text{m}$ before target slot (`PULL_OVER_RUN_M = 12`).
  2. Steer toward aiming point $4\text{m}$ beyond target slot (`PULL_OVER_AIM_M = 4`) at walking speed.
  3. Within $3\text{m}$ of slot: execute `_squareUp()`, snapping into exact final pose with zero yaw error.
- [ ] **M4.3 Slot departure maneuver**
  - Pull out starting from adjacent lane $5\text{m}$ ahead (`PULL_OUT_M = 5`).
- [ ] **M4.4 Slot-to-slot yard re-plan navigation**
  - Forward transition if destination slot is ahead; reverse transition if behind ($\le 30\text{m}$).
  - Or reverse along driving lane and turn in $7\text{m}$ prior to target slot.
  - Collision yield: hold position if another vehicle occupies intermediate space.
- [ ] **M4.5 Spawning logic: `spawn(vin, { at, colour, behind_m })`**
  - Support staging multiple vehicles spaced $9\text{m}$ apart in queue behind `line_end`.
- [ ] **M4.6 Despawn cleanup: `despawn(vin)`**
  - Remove car actor mesh, collision volumes, and attached cameras cleanly from memory/scene.

---

### Milestone 5 — On-Board Cameras, Routine R-12 & Fault System
**Goal:** Routine R-12 test sequence runs with 6 steps; VIN-DARK fails headlight evidence, VIN-OK passes.

- [ ] **M5.1 On-board vehicle camera rig (`src/lib/simulator/cameras/carCamera.ts`)**
  - **Assist (Chase):** Offset $(-6\text{m}, 0, 3\text{m})$, Pitch $-12^\circ$, FOV $90^\circ$, 10s rolling buffer (8 frames).
  - **Evidence Rear:** Offset $(-7\text{m}, 0, 1.6\text{m})$, Pitch $-5^\circ$, Yaw $0^\circ$, FOV $38^\circ$, 4s rolling buffer (8 frames).
  - **Evidence Front:** Offset $(+7.5\text{m}, 0, 1.6\text{m})$, Pitch $-5^\circ$, Yaw $180^\circ$, FOV $38^\circ$, 4s rolling buffer (8 frames).
  - Update tick rate: capture every $0.2\text{s}$ simulated time.
  - Pipeline: `WebGLRenderTarget` $\to$ `readRenderTargetPixels` $\to$ `OffscreenCanvas` $\to$ JPEG blob (quality 0.9). No visual overlays.
- [ ] **M5.2 Routine R-12 step execution (`src/lib/simulator/actors/routine.ts`)**
  Implement 6 distinct test track stages:
  1. **headlights:** Stand braked, LowBeam active, $8\text{s}$, telemetry `{ headlights: "ON" }`.
  2. **indicators:** Alternating L $\leftrightarrow$ R every $1.2\text{s}$, $10\text{s}$, telemetry `{ indicator_left: "BLINK", ... }`.
  3. **brake_lights:** Stand braked, Brake bar active, $8\text{s}$, telemetry `{ brake_signal: true, brake_lamps: "ON" }`.
  4. **reverse:** Reverse $3\text{m}$ at $\le 4\text{ km/h}$, $\le 25\text{s}$, telemetry `{ gear: "R", distance_m: 3.02, lateral_m: 0.05 }`.
  5. **brake_test:** Accelerate to $20\text{ km/h}$, hard brake stop, emit `{ start_speed_kmh, stopping_distance_m }`.
  6. **full_lock:** Steering locks: Left $90^\circ$, Right $360^\circ$, Left $270^\circ$ at $5\text{ km/h}$, $\le 90\text{s}$, record turning radii.
  - Emit `track.step` after each step with telemetry payload.
  - Ensure vehicle telemetry always reports nominal status even when hardware faults are active.
- [ ] **M5.3 Fault injection: `setFault(vin, Set(['headlights']))`**
  - Disable physical light mesh rendering while keeping internal telemetry reporting `"ON"`.
- [ ] **M5.4 Defect repair: `repair(vin, defects)`**
  - Clear assigned faults and restore visual light rendering.

---

### Milestone 6 — Props, Obstacle Detection & Assist Flow (Scene C)
**Goal:** Dynamic obstacle triggers assist request with 8-frame clip; vehicle executes supervisor's command.

- [ ] **M6.1 Dynamic prop management (`src/lib/simulator/actors/props.ts`)**
  - Implement `spawnProp(id, kind, x, y, yaw)` and `removeProp(id)` for `box`, `worker`, `cone`, `barrel`, `truck`.
- [ ] **M6.2 Forward obstacle scanning**
  - Dynamic lookahead envelope: $D = 9\text{m} + \frac{v^2}{2 \times 4}$, lateral corridor $\pm 1.8\text{m}$ of lane centreline.
  - Braking triggers for props and pedestrian workers (vehicles governed by queuing rules).
  - Explicitly ignore parked cars located on the shoulder.
- [ ] **M6.3 Blocked detection & `assist.request` generation**
  - Trigger condition: Speed $< 0.6\text{ km/h}$ for $> 5\text{s}$ with non-plant obstacle within $14\text{m}$ ahead and $\pm 3\text{m}$ lateral.
  - Emit `assist.request` with:
    - `case_id`: `"AC-<vin>-<seq>"`
    - `reason`: obstacle description string
    - `options`: subset of `['wait_for_removal', 'pass_left_3kmh', 'reroute_lane_c']`
    - `clip_frames`: 8 base64 JPEG frames sampled over the last $10\text{s}$ from chase/assist camera.
- [ ] **M6.4 Assist command execution (`AssistChooseCmd`)**
  - **`wait_for_removal`:** Hold position until corridor clears; log wait duration.
  - **`pass_left_3kmh`:** Steer $7\text{m}$ into adjacent left corridor, crawl at $3\text{ km/h}$, return after $6\text{m}$ clear, record closest proximity & contact metrics.
  - **`reroute_lane_c`:** Calculate alternative route through Lane C connector at standard speed.
- [ ] **M6.5 Media retrieval: `getAssistMedia(case_id)`**
  - Return cached 8 base64 JPEG frames for dashboard display.

---

### Milestone 7 — Gemini Parking: Kinematic Control Loop
**Goal:** Real-time kinematic bicycle control loop responds to Gemini/A* control sequences; collision-free parking in Y7 behind Y8.

- [ ] **M7.1 Kinematic bicycle model control loop (`engine.ts` / `driver.ts`)**
  - Execute per-tick control commands:
    $$\Delta x = v \cdot \cos(\psi) \cdot \Delta t$$
    $$\Delta y = v \cdot \sin(\psi) \cdot \Delta t$$
    $$\Delta \psi = \frac{v}{L} \cdot \tan(\delta) \cdot \Delta t \quad (L = 2.85\text{m})$$
  - Steering input: normalised $\delta \in [-1, 1]$ mapping to $\pm 30^\circ$ front-wheel angle (positive = left in slot frame).
- [ ] **M7.2 Obstacle bounding telemetry**
  - Report all vehicles, workers, and props within $15\text{m}$ of target parking slot as:
    `{ id, x, y, yaw, length, width, moving: boolean }`
  - Filter out ground/flat props ($< 0.15\text{m}$ height).
- [ ] **M7.3 Predictive safety emergency stop**
  - Compute $0.4\text{m}$ forward trajectory projection; trigger instant halt if clearance to any obstacle falls below $0.2\text{m}$.
- [ ] **M7.4 Parking session telemetry**
  - Maintain `parkingLog[vin]` session records (decisions, trajectory iterations, final parking pose).

---

### Milestone 8 — SimCanvas Integration (UI Embed)
**Goal:** Simulator view embedded into Qais's React dashboard layout with live camera toggle and Gemini notes.

- [ ] **M8.10 Implement `src/components/SimCanvas.tsx`**
  - Full-screen or dashboard-card Three.js WebGL canvas rendering.
  - **Main viewport:** dynamic vehicle chase camera.
  - **Mini-map overlay:** top-down orthographic camera inset positioned at bottom-right.
  - **Gemini note overlay:** live text pill at bottom-left (e.g. `"GEMINI · VIN-P1 parking Y8: path B (0.81)"`).
  - Wire listener for orchestrator note events (`{ op: 'note', text, kind }`).

---

### Milestone 10 — Demo Scenarios & Storage
**Goal:** Verify all 5 demo scenarios run stably in the 3D engine; support frame persistence.

- [ ] **M10.1 Scenario A verification:** 4-car shift (Blue + Red), route choice via Lane C, yard parking.
- [ ] **M10.2 Scenario B verification:** VIN-DARK headlight fault detected at R-12 $\to$ electrical rework $\to$ repair $\to$ recheck PASS.
- [ ] **M10.3 Scenario C verification:** VIN-STUCK obstacle detection $\to$ assist trigger $\to$ wait $\to$ lane clear resume.
- [ ] **M10.4 Scenario D verification:** Late truck T-1 repositioning $\to$ slot-to-slot moves (P2 yielding to P1).
- [ ] **M10.5 Scenario E verification:** Gemini parking Y7 with parked car at Y8.
- [ ] **M10.7 Artifact persistence:** Implement `storeArtifact(uri, blob)` storing evidence JPEGs to browser IndexedDB via `idb`.

---

## 4. Key Constants & Physics Parameters Cheat Sheet

| Parameter | Value | Location / Usage |
|---|---|---|
| Wheelbase ($L$) | $2.85\text{m}$ | Kinematic bicycle steering |
| Max Steer ($\delta_{\max}$) | $30^\circ$ ($0.5236\text{ rad}$) | Max front-wheel angle |
| Car Dimensions | $4.9\text{m} \times 1.9\text{m}$ | Collision boxes & parking clearance |
| Gate Cruise Speed | $\sim 5\text{ km/h}$ | Crossing speed at `inspection_gate` |
| Nominal Speed | $10\text{ km/h}$ | Default mission cruising speed |
| Gate Camera Res | $1280 \times 720$ | WebGL render targets, 4 poses |
| Evidence Buffer | 8 frames @ 0.2s tick | Rolling buffer for front/rear evidence |
| Assist Buffer | 8 frames @ 10s window | Rolling buffer for assist chase view |
| Queuing Gap | $6\text{m}$ standing | Proportional when rolling |
| Staging Gap | $9\text{m}$ apart | Queue behind `line_end` |
| Pull-Over Lead | $12\text{m}$ run, $4\text{m}$ aim | `PULL_OVER_RUN_M`, `PULL_OVER_AIM_M` |
| Slot Pull-Out | $5\text{m}$ ahead | `PULL_OUT_M` |
| Obstacle Envelope | $9\text{m} + \frac{v^2}{8}$, $\pm 1.8\text{m}$ lateral | Forward safety scan |
| Blocked Trigger | $< 0.6\text{ km/h}$ for $> 5\text{s}$ | Obstacle within $14\text{m} \times \pm 3\text{m}$ |
| Parking Clearance | $0.3\text{m}$ side, $\le 8^\circ$ heading | Slot acceptance criteria |
| Safety E-Stop | $< 0.2\text{m}$ margin in next $0.4\text{m}$ | Kinematic control abort |

---

## 5. Definition of Done Checklist for Faris's Code

- [ ] All simulator code compiles cleanly with `tsc --strict` without errors.
- [ ] Zero Python files or external GPU server dependencies introduced.
- [ ] Every exported class and method has complete JSDoc documentation.
- [ ] Evidence camera frames exported to Gemini have **no visual text overlays or debug drawings**.
- [ ] Named-point map coordinates in `plantMap.ts` match CARLA reference coordinates exactly.
- [ ] Implements the `DrivingSystem` interface completely as specified in `src/lib/marshal/types.ts`.

