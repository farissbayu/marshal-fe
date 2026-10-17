// zod 4 input schemas for the Marshal server functions, plus the raw JSON shapes Gemini is asked
// to return. Pure module (zod only). Gemini answers are re-checked against the safety rules in
// src/lib/serverFns/logic.ts before they reach the orchestrator.
//
// `hint` / `hints` mirror the offline truth-hint convention of src/ai/truth.ts
// (e.g. 'colour=red; damage=dent', 'headlights=off', 'worker=1'). They are never sent to Gemini;
// they only drive the deterministic offline answers.

import { z } from 'zod'

export const assistOptionSchema = z.enum(['wait_for_removal', 'pass_left_3kmh', 'reroute_lane_c'])
export const routeOptionSchema = z.enum(['finishing_corner', 'lane_c'])
export const gateViewSchema = z.enum(['front', 'rear', 'left', 'right'])

export const gateFramesSchema = z.object({
  front: z.string(),
  rear: z.string(),
  left: z.string(),
  right: z.string(),
})

export const poseSchema = z.object({ x: z.number(), y: z.number(), yaw: z.number() })

export const obstacleSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  yaw: z.number(),
  length: z.number().positive(),
  width: z.number().positive(),
  moving: z.boolean(),
})

export const slotSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  yaw: z.number(),
})

export const boundingBoxSchema = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

export const yardMoveSchema = z.object({ vin: z.string(), from: z.string(), to: z.string() })

// --- Server function inputs -----------------------------------------------------------------

export const gateInputSchema = z.object({
  vin: z.string(),
  expectedColour: z.string().min(1),
  frames: gateFramesSchema,
  hints: z
    .object({
      front: z.string().optional(),
      rear: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional(),
})
export type GateInput = z.infer<typeof gateInputSchema>

export const lampInputSchema = z.object({
  vin: z.string(),
  /** R-12 step name, e.g. 'headlights'. */
  step: z.string().min(1),
  telemetry: z.record(z.string(), z.unknown()),
  frames: z.array(z.string()),
  hint: z.string().optional(),
})
export type LampInput = z.infer<typeof lampInputSchema>

export const assistInputSchema = z.object({
  case_id: z.string(),
  reason: z.string(),
  options: z.array(assistOptionSchema).min(1),
  frames: z.array(z.string()),
  hint: z.string().optional(),
})
export type AssistInput = z.infer<typeof assistInputSchema>

export const parkingInputSchema = z.object({
  vin: z.string(),
  pose: poseSchema,
  obstacles: z.array(obstacleSchema),
  slot: slotSchema,
})
export type ParkingInput = z.infer<typeof parkingInputSchema>

export const routeInputSchema = z.object({
  hazardDescription: z.string(),
  options: z.array(routeOptionSchema).min(1),
})
export type RouteInput = z.infer<typeof routeInputSchema>

export const yardInputSchema = z.object({
  /** slot id -> VIN parked there, or null when free. */
  layout: z.record(z.string(), z.string().nullable()),
  constraints: z.object({
    priorityVins: z.array(z.string()).optional(),
    reservedSlots: z.array(z.string()).optional(),
    reason: z.string().optional(),
  }),
})
export type YardInput = z.infer<typeof yardInputSchema>

// --- Raw Gemini answers (validated, then safety-checked in code) ------------------------------

export const gateModelSchema = z.object({
  pass: z.boolean(),
  colour: z.string(),
  confidence: z.number(),
  faults: z.array(z.string()),
})
export type GateModel = z.infer<typeof gateModelSchema>

export const lampModelSchema = z.object({ observed: z.string() })
export type LampModel = z.infer<typeof lampModelSchema>

export const assistModelSchema = z.object({
  description: z.string(),
  boxes: z.array(boundingBoxSchema),
  recommendation: z.string(),
})
export type AssistModel = z.infer<typeof assistModelSchema>

export const parkingModelSchema = z.object({ decision: z.string(), confidence: z.number() })
export type ParkingModel = z.infer<typeof parkingModelSchema>

export const routeModelSchema = z.object({
  route: z.string(),
  confidence: z.number(),
  reason: z.string(),
})
export type RouteModel = z.infer<typeof routeModelSchema>

export const yardModelSchema = z.object({ moves: z.array(yardMoveSchema), reason: z.string() })
export type YardModel = z.infer<typeof yardModelSchema>
