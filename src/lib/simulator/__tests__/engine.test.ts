import { describe, expect, it } from 'vitest'
import { POINTS } from '#/lib/marshal/points'
import type { MissionDoneEvent } from '#/lib/marshal/types'
import { ThreeJsEngine } from '../engine'

function runUntil(engine: ThreeJsEngine, done: () => boolean, maxSeconds = 600): boolean {
  for (let elapsed = 0; elapsed < maxSeconds; elapsed += 0.5) {
    if (done()) return true
    engine.tick(0.5)
  }
  return done()
}

function drive(
  engine: ThreeJsEngine,
  vin: string,
  missionId: string,
  waypoints: string[],
): boolean {
  let done = false
  engine.on('mission.done', (event: MissionDoneEvent) => {
    if (event.mission_id === missionId) done = true
  })
  engine.send({ op: 'mission.go', mission_id: missionId, vin, waypoints })
  return runUntil(engine, () => done)
}

describe('ThreeJsEngine', () => {
  it('runs the acceptance loop and crosses the gate at ~5 km/h', () => {
    const engine = new ThreeJsEngine()
    engine.spawn('VIN-1', { at: 'line_end', colour: [0, 0, 1] })

    expect(drive(engine, 'VIN-1', 'M1', ['buffer_zone_b', 'inspection_gate'])).toBe(true)
    const gate = engine.getPositionXY('VIN-1')
    expect(
      Math.hypot(gate.x - POINTS.inspection_gate.x, gate.y - POINTS.inspection_gate.y),
    ).toBeLessThanOrEqual(3.5 + 1e-6)
    expect(engine.passes['VIN-1']).toBeGreaterThanOrEqual(4)
    expect(engine.passes['VIN-1']).toBeLessThanOrEqual(6.5)

    expect(drive(engine, 'VIN-1', 'M2', ['test_track'])).toBe(true)
    expect(drive(engine, 'VIN-1', 'M3', ['report_point'])).toBe(true)
    const report = engine.getPositionXY('VIN-1')
    expect(
      Math.hypot(report.x - POINTS.report_point.x, report.y - POINTS.report_point.y),
    ).toBeLessThanOrEqual(3.5 + 1e-6)
  })

  it('cruises at the mission speed', () => {
    const engine = new ThreeJsEngine()
    engine.spawn('VIN-1', { at: 'line_end', colour: [0, 0, 1] })
    let top = 0
    engine.on('status', (event) => {
      if (event.vin === 'VIN-1') top = Math.max(top, event.speed_kmh)
    })
    expect(drive(engine, 'VIN-1', 'M1', ['test_track'])).toBe(true)
    expect(top).toBeGreaterThan(9)
    expect(top).toBeLessThanOrEqual(10.5)
  })

  it('emits status about once per second', () => {
    const engine = new ThreeJsEngine()
    engine.spawn('VIN-1', { at: 'line_end', colour: [0, 0, 1] })
    let count = 0
    engine.on('status', () => {
      count++
    })
    engine.send({
      op: 'mission.go',
      mission_id: 'M-status',
      vin: 'VIN-1',
      waypoints: ['report_point'],
    })
    for (let step = 0; step < 100; step++) engine.tick(0.1)
    expect(count).toBeGreaterThanOrEqual(9)
    expect(count).toBeLessThanOrEqual(11)
  })

  it('creeps into a precise stop within the 0.4 m tolerance', () => {
    const engine = new ThreeJsEngine()
    engine.spawn('VIN-P', { at: 'line_end', colour: [1, 0, 0] })
    expect(drive(engine, 'VIN-P', 'M1', ['rework.electrical'])).toBe(true)
    const pose = engine.getPositionXY('VIN-P')
    const target = POINTS['rework.electrical']
    expect(Math.hypot(pose.x - target.x, pose.y - target.y)).toBeLessThanOrEqual(0.4 + 1e-6)
  })

  it('holds a car until the hold expires', () => {
    const engine = new ThreeJsEngine()
    engine.spawn('VIN-1', { at: 'line_end', colour: [0, 0, 1] })
    engine.send({
      op: 'mission.go',
      mission_id: 'M-hold',
      vin: 'VIN-1',
      waypoints: ['buffer_zone_b'],
    })
    engine.send({ op: 'mission.hold', vin: 'VIN-1', duration_s: 5, reason: 'test hold' })
    for (let step = 0; step < 10; step++) engine.tick(0.5)
    expect(engine.getPositionXY('VIN-1').x).toBeCloseTo(POINTS.line_end.x, 5)
    expect(
      runUntil(engine, () => engine.getPositionXY('VIN-1').x > POINTS.buffer_zone_b.x - 3.5, 60),
    ).toBe(true)
  })

  it('is deterministic for the same commands and steps', () => {
    const first = new ThreeJsEngine()
    const second = new ThreeJsEngine()
    for (const engine of [first, second]) {
      engine.spawn('VIN-1', { at: 'line_end', colour: [0, 0, 1] })
      engine.send({
        op: 'mission.go',
        mission_id: 'M-det',
        vin: 'VIN-1',
        waypoints: ['buffer_zone_b', 'inspection_gate'],
      })
    }
    for (let step = 0; step < 200; step++) {
      first.tick(0.1)
      second.tick(0.1)
    }
    expect(first.getPositionXY('VIN-1')).toEqual(second.getPositionXY('VIN-1'))
    expect(first.time).toBe(second.time)
  })
})
