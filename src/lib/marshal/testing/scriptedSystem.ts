// Scripted, deterministic DrivingSystem for tests and for the dashboard demo until the three.js
// engine lands. No timers: time only moves when `tick(dt)` is called. Cars drive in straight
// lines between named points at the mission speed, R-12 runs as a fixed sequence of steps with
// healthy telemetry, and frames are tiny placeholder base64 strings. Faults only change the
// truth hints read by the offline AI (telemetry stays ON, per TEAM_PLAN M5.3).

import { isPointName, POINTS } from '../points'
import { rgbToColourName } from '../state'
import type {
  AssistChooseCmd,
  AssistOption,
  AssistRequestEvent,
  ControlStep,
  DrivingSystem,
  EvidencePort,
  GateCapturePort,
  GateFrames,
  GateView,
  MissionDoneEvent,
  MissionGoCmd,
  ObstacleBox,
  ParkingPort,
  ParkingSlot,
  Pose,
  SimCommand,
  SimEvent,
  StatusEvent,
  TrackStepEvent,
} from '../types'

/** Lamp faults the simulator supports. */
export type LampFault = 'headlights' | 'brake_lights' | 'indicators'

/** Prop kinds accepted by `spawnProp`. */
export type PropKind = 'box' | 'worker' | 'cone' | 'barrel' | 'truck'

/** A spawned prop. */
export type ScriptedProp = { id: string; kind: PropKind; x: number; y: number; yaw: number }

/** One R-12 step as emitted on `track.step`. */
export type RoutineStep = { step: number; name: string; telemetry: Record<string, unknown> }

/** Routine R-12 (TEAM_PLAN M5.2) with the always-healthy telemetry. */
export const R12_STEPS: readonly RoutineStep[] = [
  { step: 1, name: 'headlights', telemetry: { headlights: 'ON' } },
  {
    step: 2,
    name: 'indicators',
    telemetry: { indicator_left: 'BLINK', indicator_right: 'BLINK' },
  },
  { step: 3, name: 'brake_lights', telemetry: { brake_signal: true, brake_lamps: 'ON' } },
  { step: 4, name: 'reverse', telemetry: { gear: 'R', distance_m: 3.02, lateral_m: 0.05 } },
  { step: 5, name: 'brake_test', telemetry: { start_speed_kmh: 20, stopping_distance_m: 3.9 } },
  { step: 6, name: 'full_lock', telemetry: { radius_left_m: 5.4, radius_right_m: 5.5 } },
]

/** Options for {@link ScriptedDrivingSystem}. */
export type ScriptedOptions = {
  /** Sim seconds per R-12 step (default 2; the real routine takes minutes). */
  stepSeconds?: number
  /** Distance within which props block a car waiting for removal (default 15m). */
  clearRadius_m?: number
}

type ActiveMission = {
  cmd: MissionGoCmd
  index: number
  speed_mps: number
  total_m: number
  travelled_m: number
  /** Routine steps to run once the last waypoint is reached; null until it starts. */
  steps: RoutineStep[] | null
  stepIndex: number
  stepElapsed: number
}

type ScriptedCar = {
  vin: string
  rgb: [number, number, number]
  x: number
  y: number
  yaw: number
  location: string
  speed_kmh: number
  mission: ActiveMission | null
  held: boolean
  holdLeft: number | null
  stoppedForAssist: boolean
  /** Case the car waits on with `wait_for_removal`. */
  waitingCase: string | null
  waited_s: number
  faults: Set<LampFault>
}

type AssistRecord = { vin: string; options: AssistOption[]; frames: string[] }

type Listener = (event: any) => void

const DEG = Math.PI / 180
const WHEELBASE_M = 2.85
const MAX_STEER = 30 * DEG
const OBSTACLE_RANGE_M = 15
const GATE_VIEWS: readonly GateView[] = ['front', 'rear', 'left', 'right']
const PROP_SIZE: Record<PropKind, { length: number; width: number; moving: boolean }> = {
  box: { length: 1.2, width: 1.2, moving: false },
  worker: { length: 0.6, width: 0.6, moving: true },
  cone: { length: 0.4, width: 0.4, moving: false },
  barrel: { length: 0.6, width: 0.6, moving: false },
  truck: { length: 8, width: 2.5, moving: false },
}

/**
 * A placeholder evidence frame (base64 of a short label, not a real JPEG).
 * @param label - Frame label, e.g. 'VIN-1:front:0'.
 * @returns base64 string.
 */
export function placeholderFrame(label: string): string {
  return btoa(`frame:${label}`)
}

function point(name: string): Pose {
  if (!isPointName(name)) throw new Error(`Unknown map point: ${name}`)
  return POINTS[name]
}

/**
 * Deterministic stand-in for the three.js engine. Implements the DrivingSystem contract and the
 * gate, evidence and parking ports, plus truth hints for the offline AI.
 */
export class ScriptedDrivingSystem
  implements DrivingSystem, GateCapturePort, EvidencePort, ParkingPort
{
  /** Frames are text placeholders, not JPEGs: image checks must not be sent to Gemini. */
  readonly placeholderFrames = true
  readonly passes: Record<string, number> = {}
  readonly assistOutcomes: Record<string, unknown> = {}
  readonly parkingLog: Record<string, unknown[]> = {}
  /** Every command received, oldest first. */
  readonly commands: SimCommand[] = []
  /** Artifacts saved with `storeArtifact`. */
  readonly artifacts = new Map<string, Blob>()

  private readonly listeners = new Map<string, Set<Listener>>()
  private readonly cars = new Map<string, ScriptedCar>()
  private readonly props = new Map<string, ScriptedProp>()
  private readonly assists = new Map<string, AssistRecord>()
  private readonly stepSeconds: number
  private readonly clearRadius: number
  private clock = 0

  /**
   * @param options - Routine step length and clear radius.
   */
  constructor(options: ScriptedOptions = {}) {
    this.stepSeconds = options.stepSeconds ?? 2
    this.clearRadius = options.clearRadius_m ?? 15
  }

  /** Sim time in seconds. */
  get time(): number {
    return this.clock
  }

  // --- Commands -------------------------------------------------------------------------------

  /**
   * Executes a command.
   * @param cmd - Orchestrator command.
   */
  send(cmd: SimCommand): void {
    this.commands.push(cmd)
    if (cmd.op === 'assist.choose') {
      this.choose(cmd)
      return
    }
    const car = this.cars.get(cmd.vin)
    if (!car) return
    if (cmd.op === 'mission.go') this.startMission(car, cmd)
    else if (cmd.op === 'mission.hold') {
      car.held = true
      car.holdLeft = cmd.duration_s ?? null
    } else {
      car.held = false
      car.holdLeft = null
    }
  }

  on(event: 'status', cb: (e: StatusEvent) => void): void
  on(event: 'mission.done', cb: (e: MissionDoneEvent) => void): void
  on(event: 'track.step', cb: (e: TrackStepEvent) => void): void
  on(event: 'assist.request', cb: (e: AssistRequestEvent) => void): void
  /**
   * Subscribes to simulator events.
   * @param event - Event name.
   * @param cb - Listener.
   */
  on(event: SimEvent['event'], cb: Listener): void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(cb)
  }

  // --- Direct engine calls --------------------------------------------------------------------

  /**
   * Spawns a car at a named point, optionally `behind_m` metres behind it.
   * @param vin - Car VIN.
   * @param opts - Spawn point, RGB colour and queue offset.
   */
  spawn(
    vin: string,
    opts: { at: string; colour: [number, number, number]; behind_m?: number },
  ): void {
    const at = point(opts.at)
    const back = opts.behind_m ?? 0
    this.cars.set(vin, {
      vin,
      rgb: opts.colour,
      x: at.x - back * Math.cos(at.yaw * DEG),
      y: at.y - back * Math.sin(at.yaw * DEG),
      yaw: at.yaw,
      location: opts.at,
      speed_kmh: 0,
      mission: null,
      held: false,
      holdLeft: null,
      stoppedForAssist: false,
      waitingCase: null,
      waited_s: 0,
      faults: new Set(),
    })
  }

  /**
   * Removes a car.
   * @param vin - Car VIN.
   */
  despawn(vin: string): void {
    this.cars.delete(vin)
  }

  /**
   * Sets lamp faults: the lamps stop rendering but telemetry still reports ON.
   * @param vin - Car VIN.
   * @param faults - Faulty lamps.
   */
  setFault(vin: string, faults: Set<LampFault>): void {
    const car = this.cars.get(vin)
    if (car) car.faults = new Set(faults)
  }

  /**
   * Clears the listed faults.
   * @param vin - Car VIN.
   * @param defects - Fault names to clear.
   */
  repair(vin: string, defects: string[]): void {
    const car = this.cars.get(vin)
    if (!car) return
    for (const defect of defects) car.faults.delete(defect as LampFault)
  }

  /**
   * Current car pose.
   * @param vin - Car VIN.
   * @returns Pose in the map frame (zeros for unknown cars).
   */
  getPositionXY(vin: string): Pose {
    const car = this.cars.get(vin)
    return car ? { x: car.x, y: car.y, yaw: car.yaw } : { x: 0, y: 0, yaw: 0 }
  }

  /**
   * Named point transform.
   * @param name - Named point.
   * @returns Point pose; throws for unknown points.
   */
  getTransform(name: string): Pose {
    return { ...point(name) }
  }

  /**
   * Stored clip for an assist case.
   * @param case_id - Case id.
   * @returns base64 frames ([] when unknown).
   */
  getAssistMedia(case_id: string): string[] {
    return [...(this.assists.get(case_id)?.frames ?? [])]
  }

  /**
   * Stops the car and emits `assist.request` with an 8-frame placeholder clip.
   * @param vin - Car VIN.
   * @param case_id - Case id, e.g. 'AC-VIN-1-1'.
   * @param reason - Obstacle description.
   * @param options - Offered options.
   */
  raiseAssist(vin: string, case_id: string, reason: string, options: AssistOption[]): void {
    const car = this.cars.get(vin)
    if (car) {
      car.stoppedForAssist = true
      car.speed_kmh = 0
    }
    const frames = Array.from({ length: 8 }, (_, i) => placeholderFrame(`${case_id}:${i}`))
    this.assists.set(case_id, { vin, options: [...options], frames })
    this.emit({
      event: 'assist.request',
      case_id,
      vin,
      location: car?.location ?? '',
      reason,
      options: [...options],
      clip_frames: frames,
    })
  }

  /**
   * Spawns a prop.
   * @param id - Prop id.
   * @param kind - Prop kind.
   * @param x - Map x.
   * @param y - Map y.
   * @param yaw - Degrees.
   */
  spawnProp(id: string, kind: PropKind, x: number, y: number, yaw: number): void {
    this.props.set(id, { id, kind, x, y, yaw })
  }

  /**
   * Removes a prop.
   * @param id - Prop id.
   */
  removeProp(id: string): void {
    this.props.delete(id)
  }

  /**
   * Stores an artifact in memory.
   * @param uri - Artifact URI.
   * @param blob - Content.
   */
  async storeArtifact(uri: string, blob: Blob): Promise<void> {
    this.artifacts.set(uri, blob)
  }

  // --- Ports ----------------------------------------------------------------------------------

  /**
   * Gate capture (placeholder frames).
   * @param vin - Car VIN.
   * @param views - Views to render.
   * @returns One frame per view (unrequested views are empty strings).
   */
  async capture(vin: string, views: GateView[]): Promise<GateFrames> {
    const frames: GateFrames = { front: '', rear: '', left: '', right: '' }
    for (const view of views) frames[view] = placeholderFrame(`${vin}:gate:${view}`)
    const car = this.cars.get(vin)
    if (car) this.passes[vin] = car.speed_kmh
    return frames
  }

  /**
   * Evidence buffer (8 placeholder frames).
   * @param vin - Car VIN.
   * @param camera - Evidence camera.
   * @returns base64 frames.
   */
  getEvidenceFrames(vin: string, camera: 'front' | 'rear'): string[] {
    return Array.from({ length: 8 }, (_, i) => placeholderFrame(`${vin}:${camera}:${i}`))
  }

  /**
   * Other cars and props within 15m of the slot.
   * @param vin - Car being parked (excluded).
   * @param slot - Target slot.
   * @returns Obstacle boxes.
   */
  getObstacles(vin: string, slot: ParkingSlot): ObstacleBox[] {
    const near = (x: number, y: number) => Math.hypot(x - slot.x, y - slot.y) <= OBSTACLE_RANGE_M
    const boxes: ObstacleBox[] = []
    for (const car of this.cars.values()) {
      if (car.vin === vin || !near(car.x, car.y)) continue
      boxes.push({
        id: car.vin,
        x: car.x,
        y: car.y,
        yaw: car.yaw,
        length: 4.9,
        width: 1.9,
        moving: car.speed_kmh > 0,
      })
    }
    for (const prop of this.props.values()) {
      if (!near(prop.x, prop.y)) continue
      boxes.push({ id: prop.id, x: prop.x, y: prop.y, yaw: prop.yaw, ...PROP_SIZE[prop.kind] })
    }
    return boxes
  }

  /**
   * Runs control steps with the kinematic bicycle model (exact arcs, no safety stop).
   * @param vin - Car VIN.
   * @param steps - Control steps.
   * @returns Final pose; `stopped` is always false.
   */
  async execute(vin: string, steps: ControlStep[]): Promise<{ pose: Pose; stopped: boolean }> {
    const car = this.cars.get(vin)
    if (!car) return { pose: { x: 0, y: 0, yaw: 0 }, stopped: false }
    for (const step of steps) {
      const s = step.speed_mps * step.duration_s * (step.gear === 'R' ? -1 : 1)
      const k = Math.tan(Math.max(-1, Math.min(1, step.wheel)) * MAX_STEER) / WHEELBASE_M
      const th = car.yaw * DEG
      if (Math.abs(k) < 1e-9) {
        car.x += s * Math.cos(th)
        car.y += s * Math.sin(th)
      } else {
        const nth = th + s * k
        car.x += (Math.sin(nth) - Math.sin(th)) / k
        car.y -= (Math.cos(nth) - Math.cos(th)) / k
        car.yaw = nth / DEG
      }
    }
    const pose = { x: car.x, y: car.y, yaw: car.yaw }
    const log = this.parkingLog[vin] ?? []
    log.push({ steps: steps.length, pose })
    this.parkingLog[vin] = log
    return { pose, stopped: false }
  }

  // --- Truth hints for the offline AI ---------------------------------------------------------

  /**
   * Gate hints: the actual paint colour seen by every view.
   * @param vin - Car VIN.
   * @returns Per-view hint, e.g. 'colour=red'.
   */
  gateHints(vin: string): Partial<Record<GateView, string>> {
    const car = this.cars.get(vin)
    if (!car) return {}
    const colour = `colour=${rgbToColourName(car.rgb)}`
    return Object.fromEntries(GATE_VIEWS.map((view) => [view, colour]))
  }

  /**
   * Evidence hint: what the camera actually sees of the lamps.
   * @param vin - Car VIN.
   * @param camera - Evidence camera.
   * @returns e.g. 'headlights=off'.
   */
  evidenceHint(vin: string, camera: 'front' | 'rear'): string {
    const faults = this.cars.get(vin)?.faults ?? new Set<LampFault>()
    const lamp: LampFault = camera === 'front' ? 'headlights' : 'brake_lights'
    return `${lamp}=${faults.has(lamp) ? 'off' : 'on'}`
  }

  /**
   * Assist hint: workers near the stopped car.
   * @param case_id - Case id.
   * @returns e.g. 'worker=1'.
   */
  assistHint(case_id: string): string {
    const car = this.cars.get(this.assists.get(case_id)?.vin ?? '')
    if (!car) return 'worker=0'
    const workers = [...this.props.values()].filter(
      (prop) => prop.kind === 'worker' && Math.hypot(prop.x - car.x, prop.y - car.y) <= 25,
    )
    return `worker=${workers.length}`
  }

  // --- Inspection helpers for tests and the demo ---------------------------------------------

  /**
   * Spawned props.
   * @returns Props in spawn order.
   */
  listProps(): ScriptedProp[] {
    return [...this.props.values()]
  }

  /**
   * Current mission of a car.
   * @param vin - Car VIN.
   * @returns The running mission.go command, or null.
   */
  missionOf(vin: string): MissionGoCmd | null {
    return this.cars.get(vin)?.mission?.cmd ?? null
  }

  /**
   * Faults currently set on a car.
   * @param vin - Car VIN.
   * @returns Fault names.
   */
  faultsOf(vin: string): LampFault[] {
    return [...(this.cars.get(vin)?.faults ?? [])]
  }

  // --- Simulation -----------------------------------------------------------------------------

  /**
   * Advances the simulation.
   * @param dt - Sim seconds.
   */
  tick(dt: number): void {
    this.clock += dt
    for (const car of [...this.cars.values()]) this.tickCar(car, dt)
  }

  private tickCar(car: ScriptedCar, dt: number): void {
    if (car.waitingCase !== null) this.checkCleared(car, dt)
    const mission = car.mission
    if (!mission) return
    if (car.held) {
      if (car.holdLeft !== null) {
        car.holdLeft -= dt
        if (car.holdLeft <= 0) {
          car.held = false
          car.holdLeft = null
        }
      }
      car.speed_kmh = 0
      this.emitStatus(car)
      return
    }
    if (car.stoppedForAssist) {
      car.speed_kmh = 0
      this.emitStatus(car)
      return
    }
    if (mission.steps) {
      this.tickRoutine(car, mission, dt)
      return
    }
    this.drive(car, mission, dt)
  }

  private drive(car: ScriptedCar, mission: ActiveMission, dt: number): void {
    const waypoints = mission.cmd.waypoints
    let remaining = mission.speed_mps * dt
    while (remaining > 0 && mission.index < waypoints.length) {
      const target = point(waypoints[mission.index])
      const dx = target.x - car.x
      const dy = target.y - car.y
      const distance = Math.hypot(dx, dy)
      if (distance > 1e-6) car.yaw = Math.atan2(dy, dx) / DEG
      if (distance <= remaining) {
        car.x = target.x
        car.y = target.y
        car.location = waypoints[mission.index]
        mission.index++
        mission.travelled_m += distance
        remaining -= distance
      } else {
        car.x += (dx / distance) * remaining
        car.y += (dy / distance) * remaining
        mission.travelled_m += remaining
        remaining = 0
      }
    }
    const arrived = mission.index >= waypoints.length
    car.speed_kmh = arrived ? 0 : mission.speed_mps * 3.6
    if (arrived) car.yaw = point(waypoints[waypoints.length - 1]).yaw
    this.emitStatus(car)
    if (!arrived || car.mission !== mission) return
    if (mission.cmd.routine) {
      const wanted = mission.cmd.routine_steps
      mission.steps = R12_STEPS.filter((step) => !wanted || wanted.includes(step.step))
      return
    }
    this.finish(car, mission)
  }

  private tickRoutine(car: ScriptedCar, mission: ActiveMission, dt: number): void {
    const steps = mission.steps ?? []
    mission.stepElapsed += dt
    while (mission.stepElapsed >= this.stepSeconds && mission.stepIndex < steps.length) {
      mission.stepElapsed -= this.stepSeconds
      const step = steps[mission.stepIndex]
      mission.stepIndex++
      this.emit({
        event: 'track.step',
        vin: car.vin,
        mission_id: mission.cmd.mission_id,
        routine: mission.cmd.routine ?? 'R-12',
        step: step.step,
        name: step.name,
        telemetry: { ...step.telemetry },
      })
      if (car.mission !== mission) return
    }
    if (mission.stepIndex >= steps.length) this.finish(car, mission)
  }

  private finish(car: ScriptedCar, mission: ActiveMission): void {
    car.mission = null
    car.speed_kmh = 0
    this.emit({
      event: 'mission.done',
      mission_id: mission.cmd.mission_id,
      vin: car.vin,
      location: car.location,
    })
  }

  private startMission(car: ScriptedCar, cmd: MissionGoCmd): void {
    let total = 0
    let from = { x: car.x, y: car.y }
    for (const name of cmd.waypoints) {
      const to = point(name)
      total += Math.hypot(to.x - from.x, to.y - from.y)
      from = to
    }
    car.mission = {
      cmd,
      index: 0,
      speed_mps: (cmd.max_speed_kmh ?? 10) / 3.6,
      total_m: total,
      travelled_m: 0,
      steps: null,
      stepIndex: 0,
      stepElapsed: 0,
    }
    car.held = false
    car.holdLeft = null
  }

  private choose(cmd: AssistChooseCmd): void {
    const record = this.assists.get(cmd.case_id)
    if (!record?.options.includes(cmd.option)) return
    this.assistOutcomes[cmd.case_id] = { option: cmd.option, chosen_by: cmd.chosen_by }
    const car = this.cars.get(record.vin)
    if (!car) return
    if (cmd.option === 'wait_for_removal') {
      car.waitingCase = cmd.case_id
      car.waited_s = 0
      this.checkCleared(car, 0)
    } else car.stoppedForAssist = false
  }

  private checkCleared(car: ScriptedCar, dt: number): void {
    const blocked = [...this.props.values()].some(
      (prop) => Math.hypot(prop.x - car.x, prop.y - car.y) <= this.clearRadius,
    )
    if (blocked) {
      car.waited_s += dt
      return
    }
    const case_id = car.waitingCase
    if (case_id !== null) {
      const outcome = this.assistOutcomes[case_id] as Record<string, unknown> | undefined
      this.assistOutcomes[case_id] = { ...outcome, waited_s: car.waited_s }
    }
    car.waitingCase = null
    car.stoppedForAssist = false
  }

  private emitStatus(car: ScriptedCar): void {
    const mission = car.mission
    const total = mission?.total_m ?? 0
    this.emit({
      event: 'status',
      vin: car.vin,
      location: car.location,
      x: car.x,
      y: car.y,
      speed_kmh: car.speed_kmh,
      mission_id: mission?.cmd.mission_id ?? '',
      progress: mission && total > 0 ? Math.min(1, mission.travelled_m / total) : 1,
      held: car.held,
      stopped_for_assist: car.stoppedForAssist,
    })
  }

  private emit(event: SimEvent): void {
    for (const cb of [...(this.listeners.get(event.event) ?? [])]) cb(event)
  }
}
