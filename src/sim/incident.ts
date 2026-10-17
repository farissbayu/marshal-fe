// Incident placement for flow 2: a box + worker block a car's lane a few metres after the
// first junction on its route. Pure geometry, no rendering.

import { buildPath, positionAt } from './vehicle'
import type { World } from './world'

export type IncidentActor = { id: string; kind: 'box' | 'walker' | 'vehicle'; x: number; y: number }

export type IncidentPlacement = {
  at: string
  blockDistanceM: number
  actors: IncidentActor[]
  situation: string
}

/** Returns null when the route is too short to place an incident. */
export function placeIncident(world: World, route: string[]): IncidentPlacement | null {
  if (route.length < 2) return null
  const path = buildPath(route, world)
  const legLen = path.cumulative[1] ?? 0
  if (legLen < 12) return null
  const blockDistanceM = Math.max(5, legLen - 10)
  const pos = positionAt(path, blockDistanceM)
  const nx = -Math.sin(pos.yaw)
  const ny = Math.cos(pos.yaw)
  return {
    at: route[1] as string,
    blockDistanceM,
    actors: [
      { id: 'incident.box', kind: 'box', x: pos.x, y: pos.y },
      { id: 'incident.walker', kind: 'walker', x: pos.x + nx * 2, y: pos.y + ny * 2 },
    ],
    situation: `A maintenance box and a worker block the lane ${Math.round(blockDistanceM)} m ahead.`,
  }
}
