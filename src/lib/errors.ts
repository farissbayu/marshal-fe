import type { z } from "zod";

export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "unavailable"
  | "timeout"
  | "network"
  | "server"
  | "unknown";

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly code?: string;
  readonly details?: unknown;

  constructor(opts: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    code?: string;
    details?: unknown;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.kind = opts.kind;
    this.code = opts.code;
    this.details = opts.details;
  }

  get isRecoverable() {
    return this.kind !== "forbidden" && this.kind !== "validation";
  }
}

export function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "validation";
    case 503:
      return "unavailable";
    case 504:
      return "timeout";
    default:
      return status >= 500 ? "server" : "unknown";
  }
}

export function apiErrorFromStatus(status: number, body?: ApiErrorBody): ApiError {
  const kind = kindFromStatus(status);
  const fallback: Record<ApiErrorKind, string> = {
    unauthorized: "Session invalid. Please sign in again.",
    forbidden: "You are not allowed to perform this action.",
    not_found: "Resource not found.",
    conflict: "State conflict. Reload the latest data.",
    validation: "Invalid input.",
    unavailable: "Backend dependency unavailable.",
    timeout: "Request exceeded the time limit.",
    network: "Unable to reach the server.",
    server: "A server error occurred.",
    unknown: "An unknown error occurred.",
  };
  return new ApiError({
    status,
    kind,
    code: body?.code,
    details: body?.details,
    message: body?.message || fallback[kind],
  });
}

export function zodErrorToApiError(error: z.ZodError, context: string): ApiError {
  return new ApiError({
    status: 0,
    kind: "unknown",
    code: "schema_mismatch",
    message: `Response does not match the contract for ${context}.`,
    details: error.issues,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unknown error occurred.";
}
