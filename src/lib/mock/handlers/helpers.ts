import type { HttpMethod } from "@/lib/api-client";
import { ApiError, apiErrorFromStatus } from "@/lib/errors";
import type { Pagination } from "@/lib/schemas";
import type { MockDb } from "../db";

export interface MockRequest {
  method: HttpMethod;
  path: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  params: Record<string, string>;
  db: MockDb;
}

export type MockHandler = (req: MockRequest) => unknown | Promise<unknown>;

export function fail(status: number, message: string, code?: string): never {
  throw apiErrorFromStatus(status, { message, code });
}

export function requireActor(db: MockDb, actorId: string | undefined) {
  const actor = db.actors.find((a) => a.actor_id === actorId);
  if (!actor) {
    throw new ApiError({
      status: 422,
      kind: "validation",
      message: "actor_id tidak valid.",
      code: "invalid_actor",
    });
  }
  return actor;
}

export function numberQuery(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function paginate<T>(
  items: T[],
  query: Record<string, unknown>,
): { items: T[]; pagination: Pagination } {
  const page = numberQuery(query.page, 1);
  const limit = numberQuery(query.limit, 20);
  const total = items.length;
  const last_page = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page, limit, total, last_page },
  };
}

export function strQuery(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function boolQuery(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return value === true || value === "true";
}

export function delayForMethod(method: HttpMethod): number {
  switch (method) {
    case "GET":
      return 180;
    case "POST":
    case "PUT":
    case "PATCH":
      return 420;
    default:
      return 200;
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

const DEBUG_ERRORS: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation: 422,
  unavailable: 503,
  timeout: 504,
  server: 500,
};

export function applyDebugError(value: unknown): void {
  const key = strQuery(value);
  if (key && DEBUG_ERRORS[key]) {
    fail(DEBUG_ERRORS[key], `Simulasi error deterministik: ${key}`, `debug_${key}`);
  }
}
