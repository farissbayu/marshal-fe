// Test harness: orchestrator + ScriptedDrivingSystem + offline MarshalAi on a private bus.

import type { MarshalAi } from '../../serverFns/client'
import { createEventBus, type MarshalEventMap, type MarshalNote } from '../eventBus'
import { createOrchestrator } from '../orchestrator'
import type { MarshalState } from '../state'
import { createOfflineMarshalAi } from '../testing/offlineAi'
import { ScriptedDrivingSystem } from '../testing/scriptedSystem'
import type { MissionGoCmd, SimCommand } from '../types'

/**
 * Builds a fully offline orchestrator.
 * @param opts - Pause toggle, scripted AI overrides and whether the engine's truth hints are
 * wired (default true; false mimics a real engine with no hints).
 * @returns Engine, orchestrator and captured bus traffic.
 */
export function setup(
  opts: { pauseWhenNeeded?: boolean; ai?: Partial<MarshalAi>; hints?: boolean } = {},
) {
  const ds = new ScriptedDrivingSystem()
  const bus = createEventBus<MarshalEventMap>()
  const notes: MarshalNote[] = []
  const commands: SimCommand[] = []
  bus.on('ui:note', (note) => notes.push(note))
  bus.on('marshal:command', (cmd) => commands.push(cmd))
  const orch = createOrchestrator({
    ds,
    gate: ds,
    evidence: ds,
    parking: ds,
    hints: opts.hints === false ? undefined : ds,
    ai: createOfflineMarshalAi(opts.ai),
    bus,
    clock: () => ds.time,
    pauseWhenNeeded: opts.pauseWhenNeeded ?? true,
  })
  const missionsOf = (vin: string) =>
    commands.filter((cmd): cmd is MissionGoCmd => cmd.op === 'mission.go' && cmd.vin === vin)
  const feedText = (vin?: string) => {
    const feed = orch.getState().feed.filter((entry) => vin === undefined || entry.vin === vin)
    return feed.map((entry) => `${entry.tag} ${entry.text}`)
  }
  return { ds, bus, orch, notes, commands, missionsOf, feedText }
}

/**
 * Drains pending promise callbacks (all ports and the offline AI resolve immediately).
 */
export async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

/**
 * Ticks the engine until `done` holds.
 * @param ds - Scripted engine.
 * @param getState - State getter.
 * @param done - Stop condition.
 * @param maxSeconds - Sim time budget.
 * @returns Whether the condition was met.
 */
export async function runUntil(
  ds: ScriptedDrivingSystem,
  getState: () => MarshalState,
  done: (state: MarshalState) => boolean,
  maxSeconds = 600,
): Promise<boolean> {
  const dt = 0.5
  for (let t = 0; t < maxSeconds; t += dt) {
    await flush()
    if (done(getState())) return true
    ds.tick(dt)
  }
  await flush()
  return done(getState())
}
