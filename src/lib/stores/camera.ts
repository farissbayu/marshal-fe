import { create } from "zustand";
import { CAMERA_SNAPSHOT_URL, CAMERA_STREAM_URL } from "@/lib/env";

export type CameraMode = "stream" | "snapshot";
export type CameraStatus = "connecting" | "streaming" | "snapshot_fallback" | "error";

interface CameraState {
  streamUrl: string;
  snapshotUrl: string;
  mode: CameraMode;
  status: CameraStatus;
  reconnectNonce: number;
  closedByOperator: boolean;
  setMode: (mode: CameraMode) => void;
  setStatus: (status: CameraStatus) => void;
  setClosedByOperator: (closed: boolean) => void;
  reconnect: () => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  streamUrl: CAMERA_STREAM_URL,
  snapshotUrl: CAMERA_SNAPSHOT_URL,
  mode: "stream",
  status: "connecting",
  reconnectNonce: 0,
  closedByOperator: false,
  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),
  setClosedByOperator: (closedByOperator) => set({ closedByOperator }),
  reconnect: () =>
    set((s) => ({
      reconnectNonce: s.reconnectNonce + 1,
      status: s.mode === "stream" ? "connecting" : "snapshot_fallback",
      closedByOperator: false,
    })),
}));
