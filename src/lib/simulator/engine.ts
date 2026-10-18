// ThreeJsBackend driving system (TEAM_PLAN M2.6): owns the cars, routes missions over the lane
// graph, steps the driver at a fixed 0.1 s and emits status (1 Hz) and mission.done. Implements
// the Marshal DrivingSystem contract. Pure simulation: no three.js import, so tests run headless
// and the viewer reads poses. Gate / evidence / parking ports land in M3 / M5 / M7.

import { isPointName, type NamedPoint, type PointName, YARD_SLOTS } from '#/lib/marshal/points'
import type {
  AssistOption,
  AssistRequestEvent,
  DrivingSystem,
  MissionDoneEvent,
  MissionGoCmd,
  SimCommand,
  SimEvent,
  StatusEvent,
  TrackStepEvent,
} from '#/lib/marshal/types'
import {
  ARRIVAL_RADIUS_M,
  approachSpeed,
  BRAKE_MPS2,
  CREEP_RADIUS_M,
  CREEP_SPEED_MPS,
  FIXED_STEP_S,
  GATE_RECORD_RADIUS_M,
  GATE_SLOW_ZONE_M,
  GATE_SPEED_MPS,
  LOOKAHEAD_M,
  nearestIndex,
  type PathPoint,
  PRECISE_STOP_RADIUS_M,
  PRECISE_TIMEOUT_S,
  pointAhead,
  purePursuitSteer,
  stepVehicle,
} from './actors/driver'
import { createLaneGraph, type LaneGraph } from './world/plantMap'
import { sampleCenterline } from './world/roadBuilder'

/** Default mission speed (TEAM_PLAN: max 10 km/h in the plant). */
export const DEFAULT_SPEED_KMH = 10
/** Status event period, seconds (TEAM_PLAN M2.5: 1 Hz). */
export const STATUS_PERIOD_S = 1
/** Final mission waypoints that need the precise creep-and-stop (TEAM_PLAN M2.4). */
export const PRECISE_WAYPOINTS: ReadonlySet<string> = new Set([...YARD_SLOTS, 'rework.electrical'])

type LampFault = 'headlights' | 'brake_lights' | 'indicators'

type ActiveMission = {
  cmd: MissionGoCmd
  waypoints: PointName[]
  /** Next waypoint still to be passed (intermediate ones never stop the car). */
  waypointIndex: number
  route: PathPoint[]
  routeIndex: number
  /** Final waypoint is a pull-over: creep and stop within tolerance. */
  precise: boolean
  /** Gate speed already recorded for this mission (first crossing wins). */
  gateRecorded: boolean
  creepElapsed: number
  travelled_m: number
  total_m: number
}

type EngineCar = {
  vin: string
  rgb: [number, number, number]
  x: number
  y: number
  /** Radians, CARLA frame. */
  yaw: number
  speed_mps: number
  /** Last named point passed. */
  location: string
  mission: ActiveMission | null
  held: boolean
  holdLeft: number | null
  stoppedForAssist: boolean
  faults: Set<LampFault>
}

type AssistRecord = { vin: string; options: AssistOption[]; frames: string[] }
type Listener = (event: any) => void

function routeLength(route: readonly PathPoint[]): number {
  let total = 0
  for (let index = 1; index < route.length; index++) {
    total += Math.hypot(route[index].x - route[index - 1].x, route[index].y - route[index - 1].y)
  }
  return total
}

/**
 * Deterministic driving engine over the lane graph. Cars follow sampled centre-lines with
 * pure-pursuit steering; the orchestrator drives it with `mission.go` / `mission.hold` /
 * `mission.resume`.
 */
export class ThreeJsEngine implements DrivingSystem {
  /** Commands received, oldest first. */
  readonly commands: SimCommand[] = []
  /** vin -> km/h as it crossed the gate (M2.4). */
  readonly passes: Record<string, number> = {}
  readonly assistOutcomes: Record<string, unknown> = {}
  readonly parkingLog: Record<string, unknown[]> = {}

  private readonly graph: LaneGraph
  private readonly cars = new Map<string, EngineCar>()
  private readonly listeners = new Map<SimEvent['event'], Set<Listener>>()
  private readonly assists = new Map<string, AssistRecord>()
  private readonly props = new Map<
    string,
    { id: string; kind: string; x: number; y: number; yaw: number }
  >()
  private readonly artifacts = new Map<string, Blob>()
  private clock = 0
  private statusClock = 0

  /**
   * @param graph - Lane graph (defaults to the Marshal contract map).
   */
  constructor(graph: LaneGraph = createLaneGraph()) {
    this.graph = graph
  }

  /** Sim time in seconds. */
  get time(): number {
    return this.clock
  }

  // --- Commands -------------------------------------------------------------------------------

  /**
   * Executes an orchestrator command.
   * @param cmd - Command to run.
   */
  send(cmd: SimCommand): void {
    this.commands.push(cmd)
    const car = this.cars.get(cmd.vin)
    if (!car) return
    if (cmd.op === 'mission.go') this.startMission(car, cmd)
    else if (cmd.op === 'mission.hold') {
      car.held = true
      car.holdLeft = cmd.duration_s ?? null
    } else if (cmd.op === 'mission.resume') {
      car.held = false
      car.holdLeft = null
    } else {
      // assist.choose: the case bookkeeping lives in the orchestrator; the assist manoeuvres
      // (wait / pass_left / reroute) land with M6. Clearing the stop resumes the mission.
      this.assistOutcomes[cmd.case_id] = { option: cmd.option, chosen_by: cmd.chosen_by }
      car.stoppedForAssist = false
    }
  }

  // --- Events ---------------------------------------------------------------------------------

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
    const at = this.point(opts.at)
    const back = opts.behind_m ?? 0
    const yaw = (at.yaw * Math.PI) / 180
    this.cars.set(vin, {
      vin,
      rgb: opts.colour,
      x: at.x - back * Math.cos(yaw),
      y: at.y - back * Math.sin(yaw),
      yaw,
      speed_mps: 0,
      location: opts.at,
      mission: null,
      held: false,
      holdLeft: null,
      stoppedForAssist: false,
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
   * Sets lamp faults (telemetry keeps reporting ON, per TEAM_PLAN M5.3).
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
  getPositionXY(vin: string): { x: number; y: number; yaw: number } {
    const car = this.cars.get(vin)
    if (!car) return { x: 0, y: 0, yaw: 0 }
    return { x: car.x, y: car.y, yaw: (car.yaw * 180) / Math.PI }
  }

  /**
   * Named point transform.
   * @param name - Named point.
   * @returns Point pose; throws for unknown points.
   */
  getTransform(name: string): { x: number; y: number; yaw: number } {
    const point = this.point(name)
    return { x: point.x, y: point.y, yaw: point.yaw }
  }

  /**
   * Stored clip for an assist case (empty until the evidence camera lands in M5).
   * @param case_id - Case id.
   * @returns base64 frames.
   */
  getAssistMedia(case_id: string): string[] {
    return [...(this.assists.get(case_id)?.frames ?? [])]
  }

  /**
   * Stops the car and emits `assist.request`. Clip frames and the manoeuvres land with M5/M6;
   * the offline AI answers from the truth hints until then.
   * @param vin - Car VIN.
   * @param case_id - Case id, e.g. 'AC-VIN-1-1'.
   * @param reason - Obstacle description.
   * @param options - Offered options.
   */
  raiseAssist(vin: string, case_id: string, reason: string, options: AssistOption[]): void {
    const car = this.cars.get(vin)
    if (car) {
      car.stoppedForAssist = true
      car.speed_mps = 0
    }
    this.assists.set(case_id, { vin, options: [...options], frames: [] })
    this.emit({
      event: 'assist.request',
      case_id,
      vin,
      location: car?.location ?? '',
      reason,
      options: [...options],
      clip_frames: [],
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
  spawnProp(id: string, kind: string, x: number, y: number, yaw: number): void {
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
   * Stores an artifact in memory (IndexedDB lands with M10.7).
   * @param uri - Artifact URI.
   * @param blob - Content.
   */
  async storeArtifact(uri: string, blob: Blob): Promise<void> {
    this.artifacts.set(uri, blob)
  }

  // --- Simulation -----------------------------------------------------------------------------

  /**
   * Advances the simulation in fixed 0.1 s steps and emits status at 1 Hz.
   * @param dt - Sim seconds.
   */
  tick(dt: number): void {
    if (!(dt > 0)) return
    this.clock += dt
    let left = dt
    while (left > 1e-9) {
      const step = Math.min(FIXED_STEP_S, left)
      left -= step
      for (const car of [...this.cars.values()]) this.tickCar(car, step)
    }
    this.statusClock += dt
    while (this.statusClock + 1e-9 >= STATUS_PERIOD_S) {
      this.statusClock -= STATUS_PERIOD_S
      this.emitStatuses()
    }
  }

  private point(name: string): NamedPoint {
    if (!isPointName(name)) throw new Error(`Unknown map point: ${name}`)
    const point = this.graph.points[name]
    if (!point) throw new Error(`Unknown map point: ${name}`)
    return point
  }

  private startMission(car: EngineCar, cmd: MissionGoCmd): void {
    const waypoints = cmd.waypoints.filter((name): name is PointName => isPointName(name))
    if (waypoints.length === 0) return
    const start = this.nearestPoint(car.x, car.y)
    const names: PointName[] = [start]
    let cursor: PointName = start
    for (const waypoint of waypoints) {
      names.push(...this.graph.route(cursor, waypoint).slice(1))
      cursor = waypoint
    }
    const route: PathPoint[] = []
    for (let index = 0; index < names.length - 1; index++) {
      const samples = sampleCenterline(this.point(names[index]), this.point(names[index + 1]))
      for (let sample = index === 0 ? 0 : 1; sample < samples.length; sample++) {
        route.push(samples[sample])
      }
    }
    if (route.length === 0) route.push({ ...this.point(waypoints[waypoints.length - 1]) })
    car.mission = {
      cmd,
      waypoints,
      waypointIndex: 0,
      route,
      routeIndex: 0,
      precise: PRECISE_WAYPOINTS.has(waypoints[waypoints.length - 1]),
      gateRecorded: false,
      creepElapsed: 0,
      travelled_m: 0,
      total_m: routeLength(route),
    }
    car.held = false
    car.holdLeft = null
  }

  private nearestPoint(x: number, y: number): PointName {
    let best = Object.keys(this.graph.points)[0] as PointName
    let bestDistance = Number.POSITIVE_INFINITY
    for (const [name, point] of Object.entries(this.graph.points)) {
      const distance = (point.x - x) ** 2 + (point.y - y) ** 2
      if (distance < bestDistance) {
        bestDistance = distance
        best = name as PointName
      }
    }
    return best
  }

  private tickCar(car: EngineCar, dt: number): void {
    const mission = car.mission
    if (!mission) {
      car.speed_mps = 0
      return
    }
    if (car.held) {
      if (car.holdLeft !== null) {
        car.holdLeft -= dt
        if (car.holdLeft <= 0) {
          car.held = false
          car.holdLeft = null
        }
      }
      car.speed_mps = 0
      return
    }
    if (car.stoppedForAssist) {
      car.speed_mps = 0
      return
    }

    mission.routeIndex = nearestIndex(mission.route, car.x, car.y, mission.routeIndex)
    const last = this.point(mission.waypoints[mission.waypoints.length - 1])
    const distanceToEnd = Math.hypot(last.x - car.x, last.y - car.y)

    // Intermediate waypoints are passed through; the last one stops the car.
    while (mission.waypointIndex < mission.waypoints.length - 1) {
      const waypoint = this.point(mission.waypoints[mission.waypointIndex])
      if (Math.hypot(waypoint.x - car.x, waypoint.y - car.y) > ARRIVAL_RADIUS_M + 1) break
      car.location = mission.waypoints[mission.waypointIndex]
      mission.waypointIndex++
    }

    let targetSpeed = (mission.cmd.max_speed_kmh ?? DEFAULT_SPEED_KMH) / 3.6
    if (mission.waypoints.includes('inspection_gate')) {
      const gate = this.point('inspection_gate')
      const toGate = Math.hypot(gate.x - car.x, gate.y - car.y)
      if (toGate <= GATE_SLOW_ZONE_M) targetSpeed = Math.min(targetSpeed, GATE_SPEED_MPS)
      if (toGate <= GATE_RECORD_RADIUS_M && !mission.gateRecorded) {
        mission.gateRecorded = true
        this.passes[car.vin] = car.speed_mps * 3.6
      }
    }

    if (mission.precise) {
      if (distanceToEnd <= PRECISE_STOP_RADIUS_M) {
        this.finish(car, mission)
        return
      }
      if (distanceToEnd <= CREEP_RADIUS_M) {
        mission.creepElapsed += dt
        targetSpeed = Math.min(targetSpeed, CREEP_SPEED_MPS)
        if (mission.creepElapsed >= PRECISE_TIMEOUT_S) {
          this.finish(car, mission)
          return
        }
      }
    } else if (distanceToEnd <= ARRIVAL_RADIUS_M) {
      this.finish(car, mission)
      return
    }

    const stopRadius = mission.precise ? PRECISE_STOP_RADIUS_M : ARRIVAL_RADIUS_M
    const braking = Math.sqrt(2 * BRAKE_MPS2 * Math.max(0, distanceToEnd - stopRadius))
    const speed = approachSpeed(car.speed_mps, Math.min(targetSpeed, braking), dt)
    const lookahead = pointAhead(mission.route, mission.routeIndex, LOOKAHEAD_M)
    const steer = purePursuitSteer(car, lookahead)
    const next = stepVehicle(car, steer, speed, dt)
    mission.travelled_m += Math.hypot(next.x - car.x, next.y - car.y)
    car.x = next.x
    car.y = next.y
    car.yaw = next.yaw
    car.speed_mps = next.speed_mps
  }

  private finish(car: EngineCar, mission: ActiveMission): void {
    const location = mission.waypoints[mission.waypoints.length - 1]
    car.location = location
    car.mission = null
    car.speed_mps = 0
    this.emit({
      event: 'mission.done',
      mission_id: mission.cmd.mission_id,
      vin: car.vin,
      location,
    })
  }

  private emitStatuses(): void {
    for (const car of this.cars.values()) {
      const mission = car.mission
      const total = mission?.total_m ?? 0
      this.emit({
        event: 'status',
        vin: car.vin,
        location: car.location,
        x: car.x,
        y: car.y,
        speed_kmh: car.speed_mps * 3.6,
        mission_id: mission?.cmd.mission_id ?? '',
        progress: mission && total > 0 ? Math.min(1, mission.travelled_m / total) : 1,
        held: car.held,
        stopped_for_assist: car.stoppedForAssist,
      })
    }
  }

  private emit(event: SimEvent): void {
    for (const cb of [...(this.listeners.get(event.event) ?? [])]) cb(event)
  }
}
