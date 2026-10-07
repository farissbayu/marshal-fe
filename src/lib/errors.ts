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
    unauthorized: "Sesi tidak valid. Silakan masuk kembali.",
    forbidden: "Anda tidak memiliki izin untuk aksi ini.",
    not_found: "Resource tidak ditemukan.",
    conflict: "Terjadi konflik state. Muat ulang data terbaru.",
    validation: "Input tidak valid.",
    unavailable: "Dependency backend tidak tersedia.",
    timeout: "Permintaan melebihi batas waktu.",
    network: "Tidak dapat menghubungi server.",
    server: "Terjadi kesalahan pada server.",
    unknown: "Terjadi kesalahan yang tidak diketahui.",
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
    message: `Response tidak sesuai kontrak untuk ${context}.`,
    details: error.issues,
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}
