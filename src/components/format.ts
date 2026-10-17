// Small formatting helpers shared by the shift dashboard components.

import type { CarState, CarStage } from '#/lib/marshal/state'
import type { AssistOption } from '#/lib/marshal/types'

/** Shift start as seconds after midnight (06:00, as in Main.dc.html). */
export const SHIFT_START_S = 6 * 3600

/**
 * Wall-clock time of a sim timestamp on the shift.
 * @param simSeconds - Seconds since the shift started.
 * @returns 'HH:MM:SS'.
 */
export function formatClock(simSeconds: number): string {
  const total = Math.max(0, Math.floor(SHIFT_START_S + simSeconds)) % 86_400
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((part) => String(part).padStart(2, '0')).join(':')
}

const STAGE_TEXT: Record<CarStage, string> = {
  queued: 'Queued at the line end',
  to_gate: 'Driving to the gate',
  at_gate: 'At the inspection gate',
  test_track: 'On the test track (R-12)',
  report: 'At the report point',
  to_slot: 'Driving to a slot',
  parking: 'Parking',
  parked: 'Parked',
  rework: 'Rework bay',
  waiting: 'Stopped, waiting on you',
  shipped: 'Shipped',
}

/**
 * Plain-language location of a car.
 * @param car - The car.
 * @returns e.g. 'Driving to A3' or 'Rework bay'.
 */
export function whereText(car: CarState): string {
  if (car.slot && car.stage === 'to_slot') return `Driving to ${car.slot}`
  if (car.slot && car.stage === 'parking') return `Parking in ${car.slot}`
  if (car.slot && car.stage === 'parked') return `Parked in ${car.slot}`
  return STAGE_TEXT[car.stage]
}

/** Supervisor-facing labels for the assist options. */
export const OPTION_LABELS: Record<AssistOption, string> = {
  wait_for_removal: 'Wait for removal',
  pass_left_3kmh: 'Pass left at 3 km/h',
  reroute_lane_c: 'Reroute via lane C',
}
