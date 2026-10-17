// evaluateGatePhotos (TEAM_PLAN M3.3): Gemini checks the 4 gate photos for build-sheet colour
// and body damage. Falls back to the deterministic offline check (degraded: true).

import { createServerFn } from '@tanstack/react-start'
import { type GateInput, gateInputSchema, gateModelSchema } from '#/lib/marshal/schemas'
import type { GateResult } from '#/lib/marshal/types'
import { enforceGate, offlineGate } from './logic'

export { offlineGate }

function gatePrompt(input: GateInput): string {
  return (
    'You inspect a newly built car at the plant inspection gate. The 4 images are the fixed ' +
    'gate cameras in this order: front, rear, left, right.\n' +
    `Build sheet colour: ${input.expectedColour}.\n` +
    'Check the body colour against the build sheet and look for body damage (dents, scratches, ' +
    'missing parts). Reply with ONLY JSON: {"pass":boolean,"colour":string,' +
    '"confidence":number between 0 and 1,"faults":string[] like "dent:left"}'
  )
}

async function online(data: GateInput): Promise<GateResult> {
  const { generateJson } = await import('./gemini')
  const { front, rear, left, right } = data.frames
  const model = await generateJson(gatePrompt(data), [front, rear, left, right], gateModelSchema)
  return enforceGate(data, model)
}

/**
 * Server function: evaluates the four gate photos of one car.
 * @param data - {@link GateInput}: vin, build-sheet colour, frames and optional offline hints.
 * @returns {@link GateResult}; `degraded: true` when answered offline.
 */
export const evaluateGatePhotos = createServerFn({ method: 'POST', strict: false })
  .validator((input: unknown): GateInput => gateInputSchema.parse(input))
  .handler(async ({ data }): Promise<GateResult> => {
    try {
      const { runGemini } = await import('./gemini')
      return await runGemini('evaluateGatePhotos', () => offlineGate(data), () => online(data))
    } catch {
      return offlineGate(data)
    }
  })
