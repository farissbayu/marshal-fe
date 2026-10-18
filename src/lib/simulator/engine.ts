// ThreeJsBackend driving system (TEAM_PLAN M2.6): owns the cars, routes missions over the lane
// graph, steps the driver at a fixed 0.1 s and emits status (1 Hz) and mission.done. Implements
// the Marshal DrivingSystem contract. Pure simulation: no three.js import, so tests run headless
// and the viewer reads poses. Gate / evidence / parking ports land in M3 / M5 / M7.
//
// Multi-car (M4): queueing keeps a 6 m standing gap plus a rolling headway behind lane traffic,
// pull-overs approach at walking pace and square up onto the exact point pose, departing cars
// pull out 5 m into the lane, and slot-to-slot moves drive forward (<= 40 m) or reverse (<= 30 m).
// shortcut: square-up snaps the pose (TEAM_PLAN allows it); static parked cars are not lane
// obstacles yet (M4.4 collision yield + M7 obstacle boxes land with parking); reversing backs up
// straight without the reverse-turn-in variant.

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
  FIXED_STEP_S,
  GATE_RECORD_RADIUS_M,
  GATE_SLOW_ZONE_M,
  GATE_SPEED_MPS,
  LOOKAHEAD_M,
  nearestIndex,
  type PathPoint,
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
/** Final mission waypoints that need the pull-over approach (TEAM_PLAN M2.4/M4.2). */
export const PRECISE_WAYPOINTS: ReadonlySet<string> = new Set([...YARD_SLOTS, 'rework.electrical'])

/** Queuing (TEAM_PLAN M4.1): centre-to-centre gap standing, plus a rolling headway. */
export const QUEUE_GAP_M = 6
export const QUEUE_HEADWAY_S = 1
/** Pull-over approach (TEAM_PLAN M4.2): walking pace from the run distance, square up at 3 m. */
export const PULL_OVER_RUN_M = 12
export const PULL_OVER_SPEED_MPS = 1.4
export const PULL_OVER_AIM_M = 4
export const SQUARE_UP_RADIUS_M = 3
/** Slot departure (TEAM_PLAN M4.3): leave from the lane point this far ahead. */
export const PULL_OUT_M = 5
/** Slot-to-slot moves (TEAM_PLAN M4.4): direct when within these distances. */
export const SLOT_MOVE_FORWARD_LIMIT_M = 40
export const SLOT_MOVE_REVERSE_LIMIT_M = 30
export const REVERSE_SPEED_MPS = 1
/** Queue check corridor and lookahead, metres. */
const QUEUE_LATERAL_M = 2.5
const QUEUE_LOOKAHEAD_M = 40
/** A car within this of a pull-over point is parked, not queueing. */
const PULLOVER_RADIUS_M = 2

type LampFault = 'headlights' | 'brake_lights' | 'indicators'

type ActiveMission = {
  cmd: MissionGoCmd
  waypoints: PointName[]
  /** Next waypoint still to be passed (intermediate ones never stop the car). */
  waypointIndex: number
  route: PathPoint[]
  routeIndex: number
  /** Final waypoint is a pull-over: approach at walking pace, then square up on the pose. */
  precise: boolean
  /** Slot-to-slot move driven in reverse. */
  reverse: boolean
  /** Gate speed already recorded for this mission (first crossing wins). */
  gateRecorded: boolean
  preciseElapsed: number
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
  /** Yard slots plus the rework bay: pull-over points (M4.1/M4.2). */
  private readonly pullOvers: NamedPoint[]
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
    const pullOverNames: PointName[] = [...YARD_SLOTS, 'rework.electrical']
    this.pullOvers = pullOverNames.map((name) => graph.points[name])
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
    const destination = this.point(waypoints[waypoints.length - 1])
    const fromPull = this.pullOverAt(car.x, car.y)

    // Slot-to-slot moves (M4.4): drive directly when the target is near enough.
    if (fromPull && waypoints.length === 1 && this.pullOverAt(destination.x, destination.y)) {
      const yaw = (fromPull.yaw * Math.PI) / 180
      const ahead =
        (destination.x - car.x) * Math.cos(yaw) + (destination.y - car.y) * Math.sin(yaw)
      if (ahead > 0 && ahead <= SLOT_MOVE_FORWARD_LIMIT_M) {
        this.assign(car, this.directMission(car, cmd, waypoints, destination, false))
        return
      }
      if (ahead < 0 && -ahead <= SLOT_MOVE_REVERSE_LIMIT_M) {
        this.assign(car, this.directMission(car, cmd, waypoints, destination, true))
        return
      }
    }

    // Slot departure (M4.3): a car leaving a pull-over starts from the lane 5 m ahead.
    if (fromPull) {
      const yaw = (fromPull.yaw * Math.PI) / 180
      car.x = fromPull.x + Math.cos(yaw) * PULL_OUT_M
      car.y = fromPull.y + Math.sin(yaw) * PULL_OUT_M
      car.yaw = yaw
    }

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
    if (route.length === 0) route.push({ ...destination })
    this.assign(car, {
      cmd,
      waypoints,
      waypointIndex: 0,
      route,
      routeIndex: 0,
      precise: PRECISE_WAYPOINTS.has(waypoints[waypoints.length - 1]),
      reverse: false,
      gateRecorded: false,
      preciseElapsed: 0,
      travelled_m: 0,
      total_m: routeLength(route),
    })
  }

  private directMission(
    car: EngineCar,
    cmd: MissionGoCmd,
    waypoints: PointName[],
    destination: NamedPoint,
    reverse: boolean,
  ): ActiveMission {
    return {
      cmd,
      waypoints,
      waypointIndex: 0,
      route: [
        { x: car.x, y: car.y },
        { x: destination.x, y: destination.y },
      ],
      routeIndex: 0,
      precise: true,
      reverse,
      gateRecorded: false,
      preciseElapsed: 0,
      travelled_m: 0,
      total_m: Math.hypot(destination.x - car.x, destination.y - car.y),
    }
  }

  private assign(car: EngineCar, mission: ActiveMission): void {
    car.mission = mission
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

    // Slot-to-slot reverse (M4.4): back straight towards the target, then square up.
    if (mission.reverse) {
      const step = Math.min(REVERSE_SPEED_MPS * dt, Math.max(0, distanceToEnd - SQUARE_UP_RADIUS_M))
      car.x -= Math.cos(car.yaw) * step
      car.y -= Math.sin(car.yaw) * step
      car.speed_mps = dt > 0 ? step / dt : 0
      mission.travelled_m += step
      if (distanceToEnd - step <= SQUARE_UP_RADIUS_M + 1e-9) {
        this.squareUp(car, last)
        this.finish(car, mission)
      }
      return
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

    // Pull-over (M4.2): walking pace inside the run distance, square up at the radius.
    if (mission.precise) {
      if (distanceToEnd <= SQUARE_UP_RADIUS_M) {
        this.squareUp(car, last)
        this.finish(car, mission)
        return
      }
      if (distanceToEnd <= PULL_OVER_RUN_M) {
        mission.preciseElapsed += dt
        targetSpeed = Math.min(targetSpeed, PULL_OVER_SPEED_MPS)
        if (mission.preciseElapsed >= PRECISE_TIMEOUT_S) {
          this.squareUp(car, last)
          this.finish(car, mission)
          return
        }
      }
    } else if (distanceToEnd <= ARRIVAL_RADIUS_M) {
      this.finish(car, mission)
      return
    }

    // Queuing (M4.1): hold the standing gap plus a rolling headway behind lane traffic. Queuing
    // never raises an assist request; only raiseAssist does.
    const leader = this.leaderGap(car)
    if (leader !== null) {
      const required = QUEUE_GAP_M + car.speed_mps * QUEUE_HEADWAY_S
      targetSpeed = Math.min(targetSpeed, Math.max(0, (leader - required) / dt))
    }

    const stopRadius = mission.precise ? SQUARE_UP_RADIUS_M : ARRIVAL_RADIUS_M
    const braking = Math.sqrt(2 * BRAKE_MPS2 * Math.max(0, distanceToEnd - stopRadius))
    const speed = approachSpeed(car.speed_mps, Math.min(targetSpeed, braking), dt)
    let lookahead = pointAhead(mission.route, mission.routeIndex, LOOKAHEAD_M)
    if (mission.precise && distanceToEnd <= PULL_OVER_RUN_M) {
      // Aim 4 m beyond the pull-over along its heading, so the approach lines up with the slot.
      const pullYaw = (last.yaw * Math.PI) / 180
      lookahead = {
        x: last.x + Math.cos(pullYaw) * PULL_OVER_AIM_M,
        y: last.y + Math.sin(pullYaw) * PULL_OVER_AIM_M,
      }
    }
    const steer = purePursuitSteer(car, lookahead)
    const next = stepVehicle(car, steer, speed, dt)
    mission.travelled_m += Math.hypot(next.x - car.x, next.y - car.y)
    car.x = next.x
    car.y = next.y
    car.yaw = next.yaw
    car.speed_mps = next.speed_mps
  }

  /** Pull-over point within the parked radius of a pose, or null. */
  private pullOverAt(x: number, y: number): NamedPoint | null {
    for (const point of this.pullOvers) {
      if (Math.hypot(point.x - x, point.y - y) <= PULLOVER_RADIUS_M) return point
    }
    return null
  }

  /**
   * Gap to the nearest car ahead that holds the queue, or null when the lane is clear. A car
   * holds the queue while it has an active mission or stands still in the lane; cars parked on
   * pull-over points are ignored (TEAM_PLAN M4.1 shoulder tolerance).
   */
  private leaderGap(car: EngineCar): number | null {
    const fx = Math.cos(car.yaw)
    const fy = Math.sin(car.yaw)
    let nearest: number | null = null
    for (const other of this.cars.values()) {
      if (other.vin === car.vin) continue
      if (!other.mission && (other.speed_mps !== 0 || this.pullOverAt(other.x, other.y))) continue
      const dx = other.x - car.x
      const dy = other.y - car.y
      const ahead = dx * fx + dy * fy
      if (ahead <= 0 || ahead > QUEUE_LOOKAHEAD_M) continue
      if (Math.abs(dx * fy - dy * fx) > QUEUE_LATERAL_M) continue
      if (nearest === null || ahead < nearest) nearest = ahead
    }
    return nearest
  }

  /**
   * Snaps the car onto the exact point pose (TEAM_PLAN M4.2 square-up, zero yaw error).
   * @param car - Car to place.
   * @param point - Named point whose pose is taken.
   */
  private squareUp(car: EngineCar, point: NamedPoint): void {
    car.x = point.x
    car.y = point.y
    car.yaw = (point.yaw * Math.PI) / 180
    car.speed_mps = 0
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
