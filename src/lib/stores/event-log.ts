import { create } from "zustand";
import type { FlowEvent } from "@/lib/schemas";

export const EVENT_BUFFER_LIMIT = 400;

interface EventLogState {
  events: FlowEvent[];
  activeFlowFilter: number | null;
  isPaused: boolean;
  connection: "idle" | "connecting" | "open" | "error";
  addEvents: (newEvents: FlowEvent[]) => void;
  clear: () => void;
  setFlowFilter: (flow: number | null) => void;
  togglePaused: () => void;
  setConnection: (connection: EventLogState["connection"]) => void;
}

export const useEventLogStore = create<EventLogState>((set) => ({
  events: [],
  activeFlowFilter: null,
  isPaused: false,
  connection: "idle",
  addEvents: (newEvents) =>
    set((state) => {
      if (newEvents.length === 0) return state;
      const merged = [...state.events, ...newEvents].sort((a, b) => a.seq - b.seq);
      const limited =
        merged.length > EVENT_BUFFER_LIMIT ? merged.slice(-EVENT_BUFFER_LIMIT) : merged;
      return { events: limited };
    }),
  clear: () => set({ events: [] }),
  setFlowFilter: (activeFlowFilter) => set({ activeFlowFilter }),
  togglePaused: () => set((s) => ({ isPaused: !s.isPaused })),
  setConnection: (connection) => set({ connection }),
}));
