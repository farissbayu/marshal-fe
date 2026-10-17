// Deterministic batch manifest (T13): VINs, build sheets, colours, trucks and labels.
// Same (batchId, cars, seed) always yields the same manifest.

import { colourHex, WRONG_COLOUR } from '#/lib/colors'
import type { BatchCar, BuildColour, Expected, Manifest } from '../records'
import { makeRng } from '../rng'
import { buildTrucks } from '../trucks'

const BUILD_COLOURS: BuildColour[] = ['blue', 'white', 'grey', 'black']

export function deriveSeed(batchId: string): number {
  let h = 2166136261
  for (let i = 0; i < batchId.length; i++) {
    h ^= batchId.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 2147483647
}

export function buildManifest(batchId: string, cars: number, seed?: number): Manifest {
  const resolvedSeed = seed ?? deriveSeed(batchId)
  const rng = makeRng(resolvedSeed)
  const code = `B${batchId.replace(/\D/g, '').slice(-2).padStart(2, '0')}`

  const labels: Expected[] = []
  if (cars === 1) {
    labels.push({ kind: 'clean' })
  } else {
    labels.push({ kind: 'wrong_colour' })
    if (cars >= 3) {
      labels.push({ kind: 'dead_lamp', faultStep: rng.pick(['headlights', 'brake_lights']) })
      labels.push({ kind: 'incident' })
    }
    while (labels.length < cars) labels.push({ kind: 'clean' })
  }

  const batchCars: BatchCar[] = []
  for (let i = 0; i < cars; i++) {
    const expected = labels[i] as Expected
    const declared = expected.kind === 'wrong_colour' ? 'blue' : rng.pick(BUILD_COLOURS)
    const colour = expected.kind === 'wrong_colour' ? WRONG_COLOUR.hex : colourHex(declared)
    batchCars.push({
      vin: `VIN-${code}-${i + 1}`,
      expected,
      state: 'waiting_dispatch',
      stage: 1,
      location: 'line_end',
      buildSheet: { model: `M-${100 + i}`, colour: declared, options: [] },
      colour,
    })
  }

  return {
    batchId,
    seed: resolvedSeed,
    cars: batchCars,
    trucks: buildTrucks(cars),
  }
}

export function incidentVin(manifest: Manifest): string | undefined {
  return manifest.cars.find((c) => c.expected.kind === 'incident')?.vin
}
