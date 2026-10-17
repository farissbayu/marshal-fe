// Server-only AI entry point. Wraps the ADK agents (or the offline handlers when no key is
// configured) behind a TanStack Start server function so the browser can call it via RPC.
// This is the ONLY module allowed to read GOOGLE_GENAI_API_KEY / GOOGLE_GENAI_USE_VERTEXAI.

try {
  process.loadEnvFile?.()
} catch {
  // Ignore if .env is not present or already loaded
}

import { createServerFn } from '@tanstack/react-start'
import { offlineTask } from './offline'
import { type AiTaskName, aiTasks, validateTask } from './tasks'

export type AiTaskResult = {
  ok: boolean
  degraded: boolean
  result?: unknown
  error?: string
}

const MODEL_TIMEOUT_MS = 15_000

function isKeyConfigured(): boolean {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? ''
  const vertex =
    process.env.GOOGLE_GENAI_USE_VERTEXAI ?? process.env.GOOGLE_GENAI_USE_ENTERPRISE ?? ''
  return apiKey.trim() !== '' || vertex.trim() !== ''
}

function modelName(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
}

async function runOnline(task: AiTaskName, payload: unknown): Promise<unknown> {
  const { runTaskAgent } = await import('./agents/specialists')
  const result = await withTimeout(runTaskAgent(task, payload, modelName()), MODEL_TIMEOUT_MS)
  return aiTasks[task].output.parse(result)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ai task timed out after ${ms}ms`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function offlineResult(task: AiTaskName, payload: unknown, error?: string): AiTaskResult {
  try {
    return { ok: true, degraded: true, result: offlineTask(task, payload as never), error }
  } catch (fallbackError) {
    return { ok: false, degraded: true, error: error ?? errorMessage(fallbackError) }
  }
}

export const aiTask = createServerFn({ method: 'POST', strict: false })
  .validator((input: unknown): { task: AiTaskName; payload: unknown } => {
    const request = input as { task?: unknown; payload?: unknown } | null
    if (!request || typeof request !== 'object') throw new Error('aiTask: invalid request')
    return { task: request.task as AiTaskName, payload: request.payload }
  })
  .handler(async ({ data }): Promise<AiTaskResult> => {
    const { task } = data
    try {
      const payload = validateTask(task, data.payload)
      if (!isKeyConfigured()) {
        return { ok: true, degraded: true, result: offlineTask(task, payload) }
      }
      try {
        const result = await runOnline(task, payload)
        return { ok: true, degraded: false, result }
      } catch (error) {
        console.warn(`[aiTask:${task}] falling back to offline:`, errorMessage(error))
        return {
          ok: true,
          degraded: true,
          result: offlineTask(task, payload),
          error: errorMessage(error),
        }
      }
    } catch (error) {
      return offlineResult(task, data.payload, errorMessage(error))
    }
  })
