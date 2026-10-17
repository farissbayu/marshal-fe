// Gate flow (TEAM_PLAN M3.4): on arrival at `inspection_gate`, capture the four gate views,
// ask Gemini for the colour / damage check, log it, then send the car to the test track (pass)
// or the electrical rework bay (fail).

import { UNVERIFIED_FAULT } from '../../serverFns/logic'
import { patchCar } from '../state'
import type { GateView } from '../types'
import type { FlowContext } from './context'

const GATE_VIEWS: GateView[] = ['front', 'rear', 'left', 'right']

/**
 * Runs the gate check for a car that just reached `inspection_gate`.
 * @param ctx - Flow context.
 * @param vin - Car at the gate.
 * @returns Resolves once the next mission is sent.
 */
export async function handleGateArrival(ctx: FlowContext, vin: string): Promise<void> {
  const car = ctx.state().cars[vin]
  if (!car) return
  ctx.update((state) => patchCar(state, vin, { stage: 'at_gate', location: 'inspection_gate' }))

  const frames = await ctx.gate.capture(vin, GATE_VIEWS)
  const hints = ctx.hints?.gateHints?.(vin)
  const result = await ctx.ai.evaluateGatePhotos({
    vin,
    expectedColour: car.expectedColour,
    frames,
    ...(hints ? { hints } : {}),
  })

  const confidence = result.confidence.toFixed(2)
  if (result.pass) {
    ctx.decide(vin, 'GEMINI', `Gate PASS: ${result.colour} as built (${confidence})`, {
      degraded: result.degraded,
    })
    ctx.update((state) => patchCar(state, vin, { stage: 'test_track' }))
    ctx.go(vin, ['test_track'], 'track', { routine: 'R-12' })
    return
  }

  const faults = result.faults.join(', ') || 'failed'
  ctx.decide(
    vin,
    'GEMINI',
    `Gate FAIL: ${faults}; saw ${result.colour}, built ${car.expectedColour} (${confidence})`,
    { exception: true, degraded: result.degraded },
  )
  const reworkReason = result.faults.includes(UNVERIFIED_FAULT) ? 'inspection' : 'gate'
  ctx.update((state) => patchCar(state, vin, { stage: 'rework', reworkReason }))
  ctx.go(vin, ['rework.electrical'], 'rework')
}
