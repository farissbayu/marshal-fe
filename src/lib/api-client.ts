import type { z } from "zod";
import { API_BASE_URL, MOCK_MODE, REQUEST_TIMEOUT_MS } from "./env";
import { ApiError, apiErrorFromStatus, zodErrorToApiError } from "./errors";
import { mockRequest } from "./mock";
import { useAuthStore } from "./stores/auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions<T> {
  query?: Record<string, unknown>;
  body?: unknown;
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
  timeoutMs?: number;
  idempotencyKey?: string;
}

export function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function validate<T>(data: unknown, schema: z.ZodType<T> | undefined, path: string): T {
  if (!schema) return data as T;
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.warn(`[api] schema mismatch for ${path}`, parsed.error.issues);
    }
    throw zodErrorToApiError(parsed.error, path);
  }
  return parsed.data;
}

function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function realRequest<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions<T>,
): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL.replace(/\/$/, "")}${path}${buildQueryString(options.query)}`;

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(
    () => controller.abort(new DOMException("Timeout", "TimeoutError")),
    timeoutMs,
  );

  if (options.signal) {
    if (options.signal.aborted) controller.abort(options.signal.reason);
    else
      options.signal.addEventListener("abort", () => controller.abort(options.signal?.reason), {
        once: true,
      });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(),
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError({
        status: 0,
        kind: "timeout",
        message: "Permintaan melebihi batas waktu.",
      });
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError({ status: 0, kind: "network", message: "Tidak dapat menghubungi server." });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw apiErrorFromStatus(
      response.status,
      body as { code?: string; message?: string } | undefined,
    );
  }

  return validate(body, options.schema, path);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  if (MOCK_MODE) {
    const data = await mockRequest(method, path, options.query, options.body, options.signal);
    return validate(data, options.schema, path);
  }
  return realRequest(method, path, options);
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions<T>, "body">) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions<T>, "body">) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions<T>, "body">) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions<T>, "body">) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions<T>, "body">) =>
    request<T>("DELETE", path, options),
};
