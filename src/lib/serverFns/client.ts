// Browser-safe Marshal AI client. Calls the six server functions over createServerFn RPC (lazy
// imports, same pattern as src/ai/client.ts) and falls back to the deterministic offline answer
// when a call throws, so every method always resolves. Never reads env, never imports SDKs.

import type {
  AssistInput,
  GateInput,
  LampInput,
  ParkingInput,
  RouteInput,
  YardInput,
} from '#/lib/marshal/schemas'
import type {
  AssistAnalysis,
  GateResult,
  LampResult,
  ParkingStep,
  RouteChoice,
  YardReplan,
} from '#/lib/marshal/types'
import {
  offlineAssist,
  offlineGate,
  offlineLamp,
  offlineParking,
  offlineRoute,
  offlineYard,
} from './logic'

/** The Marshal AI surface the orchestrator and flows depend on. */
export type MarshalAi = {
  /** Gate check (M3.3). */
  evaluateGatePhotos: (input: GateInput) => Promise<GateResult>
  /** Lamp check (M5.5). */
  evaluateLampEvidence: (input: LampInput) => Promise<LampResult>
  /** Assist clip analysis (M6.6). */
  analyzeAssistClip: (input: AssistInput) => Promise<AssistAnalysis>
  /** Parking step (M7.5). */
  planParkingStep: (input: ParkingInput) => Promise<ParkingStep>
  /** Route choice (M9.1). */
  chooseRouteHazard: (input: RouteInput) => Promise<RouteChoice>
  /** Yard re-plan (M9.2). */
  replanYardSlots: (input: YardInput) => Promise<YardReplan>
}

const remote: MarshalAi = {
  async evaluateGatePhotos(input) {
    const { evaluateGatePhotos } = await import('./gate')
    return evaluateGatePhotos({ data: input })
  },
  async evaluateLampEvidence(input) {
    const { evaluateLampEvidence } = await import('./lamp')
    return evaluateLampEvidence({ data: input })
  },
  async analyzeAssistClip(input) {
    const { analyzeAssistClip } = await import('./assist')
    return analyzeAssistClip({ data: input })
  },
  async planParkingStep(input) {
    const { planParkingStep } = await import('./parking')
    return planParkingStep({ data: input })
  },
  async chooseRouteHazard(input) {
    const { chooseRouteHazard } = await import('./route')
    return chooseRouteHazard({ data: input })
  },
  async replanYardSlots(input) {
    const { replanYardSlots } = await import('./yard')
    return replanYardSlots({ data: input })
  },
}

function guard<I, O>(
  name: string,
  call: (input: I) => Promise<O>,
  offline: (input: I) => O,
): (input: I) => Promise<O> {
  return async (input) => {
    try {
      return await call(input)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[marshalAi:${name}] falling back to offline:`, message)
      return offline(input)
    }
  }
}

/**
 * Creates the Marshal AI client.
 * @param send - Optional per-method implementations (tests inject these instead of RPC).
 * @returns A {@link MarshalAi} whose methods never reject: on any error they return the
 * deterministic offline answer (`degraded: true`).
 */
export function createMarshalAi(send: Partial<MarshalAi> = {}): MarshalAi {
  return {
    evaluateGatePhotos: guard(
      'evaluateGatePhotos',
      send.evaluateGatePhotos ?? remote.evaluateGatePhotos,
      offlineGate,
    ),
    evaluateLampEvidence: guard(
      'evaluateLampEvidence',
      send.evaluateLampEvidence ?? remote.evaluateLampEvidence,
      offlineLamp,
    ),
    analyzeAssistClip: guard(
      'analyzeAssistClip',
      send.analyzeAssistClip ?? remote.analyzeAssistClip,
      offlineAssist,
    ),
    planParkingStep: guard(
      'planParkingStep',
      send.planParkingStep ?? remote.planParkingStep,
      (input) => offlineParking(input),
    ),
    chooseRouteHazard: guard(
      'chooseRouteHazard',
      send.chooseRouteHazard ?? remote.chooseRouteHazard,
      offlineRoute,
    ),
    replanYardSlots: guard(
      'replanYardSlots',
      send.replanYardSlots ?? remote.replanYardSlots,
      offlineYard,
    ),
  }
}
