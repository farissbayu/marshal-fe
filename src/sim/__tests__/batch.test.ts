import { describe, expect, it } from 'vitest'
import { offlineAi } from '#/ai/offline'
import { truthCapture } from '#/ai/truth'
import { buildManifest } from '../batch/manifest'
import { BatchRunner } from '../batch/orchestrator'
import { FIXED_DT } from '../engine'
import { world } from '../world'

async function runBatch(cars: number, seed = 7): Promise<BatchRunner> {
  const runner = new BatchRunner({
    batchId: `BAT-0${cars}`,
    cars,
    seed,
    ai: offlineAi,
    capture: truthCapture,
    world,
    generatedAt: () => '2026-01-01T00:00:00.000Z',
    degraded: () => true,
  })
  runner.start()
  let steps = 0
  while (runner.status === 'running' && steps < 60000) {
    await runner.step(FIXED_DT)
    steps++
  }
  return runner
}

describe('buildManifest', () => {
  it('is deterministic and applies the labelling rules', () => {
    const a = buildManifest('BAT-01', 3, 7)
    const b = buildManifest('BAT-01', 3, 7)
    expect(a).toEqual(b)
    const kinds = a.cars.map((c) => c.expected.kind).sort()
    expect(kinds).toEqual(['dead_lamp', 'incident', 'wrong_colour'])
    expect(a.cars[0]?.vin).toMatch(/^VIN-B01-1$/)
    expect(a.trucks.length).toBe(2)
  })

  it('gives N=1 a clean car and one truck', () => {
    const m = buildManifest('BAT-05', 1, 1)
    expect(m.cars[0]?.expected.kind).toBe('clean')
    expect(m.trucks.length).toBe(1)
  })
})

describe('BatchRunner (offline)', () => {
  it('finishes a 1-car batch with a 7-flow report', async () => {
    const runner = await runBatch(1)
    expect(runner.status).toBe('done')
    expect(runner.report).toBeDefined()
    expect(runner.report?.batchSize).toBe(1)
    expect(runner.report?.gemini.perFlow).toHaveLength(7)
    expect(runner.report?.gemini.degraded).toBe(true)
    expect(runner.counts.flow6.status).toBe('not_triggered')
    expect(runner.counts.flow7.status).toBe('not_triggered')
  })

  it('finishes a 3-car batch with an incident, wrong colour and dead lamp', async () => {
    const runner = await runBatch(3)
    expect(runner.status).toBe('done')
    expect(runner.report?.gemini.perFlow).toHaveLength(7)
    expect(runner.counts.flow2.cases).toBeGreaterThanOrEqual(1)
    expect(runner.counts.flow3.fail).toBeGreaterThanOrEqual(1)
    expect(runner.counts.flow4.fail).toBeGreaterThanOrEqual(1)
    expect(runner.counts.flow5.rework).toBeGreaterThanOrEqual(1)
    const labels = runner.report?.labels
    expect(labels?.total).toBe(3)
    expect(labels?.caught).toBeGreaterThanOrEqual(2)
    expect(runner.counts.flow6.status).toBe('ok')
  })
})
