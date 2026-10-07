import { create } from "zustand";
import { MOCK_MODE } from "@/lib/env";

export type ApiStatus = "connected" | "degraded" | "offline";
export type StreamStatus = "live" | "reconnecting" | "offline";

interface AppState {
  mockMode: boolean;
  apiStatus: ApiStatus;
  streamStatus: StreamStatus;
  lastUpdated: number | null;
  online: boolean;
  sidebarCollapsed: boolean;
  setApiStatus: (status: ApiStatus) => void;
  setStreamStatus: (status: StreamStatus) => void;
  touch: () => void;
  setOnline: (online: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mockMode: MOCK_MODE,
  apiStatus: "connected",
  streamStatus: "offline",
  lastUpdated: null,
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  sidebarCollapsed: false,
  setApiStatus: (apiStatus) => set({ apiStatus }),
  setStreamStatus: (streamStatus) => set({ streamStatus }),
  touch: () => set({ lastUpdated: Date.now() }),
  setOnline: (online) => set({ online }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
