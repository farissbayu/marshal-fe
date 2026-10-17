import { create } from "zustand";
import type { Actor } from "@/lib/schemas";

interface AuthState {
  actor: Actor | null;
  token: string | null;
  setActor: (actor: Actor | null) => void;
  setToken: (token: string | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  actor: null,
  token: null,
  setActor: (actor) => set({ actor }),
  setToken: (token) => set({ token }),
  clear: () => set({ actor: null, token: null }),
}));
