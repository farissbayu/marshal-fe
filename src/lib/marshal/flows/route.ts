// Route flow (TEAM_PLAN M9.1): at `report_point` Gemini picks the finishing corner or lane C
// given the current hazard description, the yard assigns a slot, and the car drives to
// `yard.entry` where the parking flow takes over.

import { firstFreeSimSlot, patchCar, slotToPoint } from '../state'
import type { RouteOption } from '../types'
import type { FlowContext } from './context'

/** Route options offered at `report_point`. */
export const ROUTE_OPTIONS: RouteOption[] = ['finishing_corner', 'lane_c']

/** Named point each route drives through. */
export const ROUTE_POINT: Record<RouteOption, string> = {
  finishing_corner: 'finishing',
  lane_c: 'lane_c',
}

/**
 * Handles arrival at `report_point`.
 * @param ctx - Flow context.
 * @param vin - Car at the report point.
 * @returns Resolves once the yard mission is sent (or the car is held for a full yard).
 */
export async function handleReportArrival(ctx: FlowContext, vin: string): Promise<void> {
  if (!ctx.state().cars[vin]) return
  ctx.update((state) => patchCar(state, vin, { stage: 'report', location: 'report_point' }))

  const choice = await ctx.ai.chooseRouteHazard({
    hazardDescription: ctx.state().hazard ?? '',
    options: ROUTE_OPTIONS,
  })
  const via = ROUTE_OPTIONS.includes(choice.route) ? choice.route : 'finishing_corner'
  const text = `Route via ${via} (${choice.confidence.toFixed(2)}): ${choice.reason}`
  ctx.decide(vin, 'GEMINI', text, { exception: via === 'lane_c', degraded: choice.degraded })

  const slot = firstFreeSimSlot(ctx.state())
  if (!slot) {
    const held = 'No free yard slot; holding at the report point for the yard crew'
    ctx.update((state) => patchCar(state, vin, { held }))
    ctx.decide(vin, 'YARD', held, { exception: true })
    return
  }
  ctx.decide(vin, 'YARD', `Assigned slot ${slot} (${slotToPoint(slot)})`)
  ctx.update((state) => patchCar(state, vin, { stage: 'to_slot', slot }))
  ctx.go(vin, [ROUTE_POINT[via], 'yard.entry'], 'yard')
}
