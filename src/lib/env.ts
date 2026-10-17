const rawMock = import.meta.env.VITE_MOCK_MODE === "true";

/**
 * Mock mode is enabled when VITE_MOCK_MODE=true.
 * Defaults to true in development.
 */
export const MOCK_MODE =
  import.meta.env.VITE_MOCK_MODE !== undefined ? rawMock : import.meta.env.DEV;

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api/v1";

export const APP_TITLE =
  (import.meta.env.VITE_APP_TITLE as string | undefined) ?? "Marshal Control Tower";

export const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 5000);

export const REQUEST_TIMEOUT_MS = 12_000;

export const IS_DEVELOPMENT = import.meta.env.MODE === "development";

export const CAMERA_STREAM_URL = `${API_BASE_URL}/camera/stream`;
export const CAMERA_SNAPSHOT_URL = `${API_BASE_URL}/camera/snapshot`;
// Defaults to the API's SSE; point VITE_EVENTS_URL at marshal_ai's dashboard (:8090) for a local
// run without the API. Relative paths go through the dev proxy in vite.config.ts.
export const EVENTS_URL =
  (import.meta.env.VITE_EVENTS_URL as string | undefined) ?? `${API_BASE_URL}/events`;
