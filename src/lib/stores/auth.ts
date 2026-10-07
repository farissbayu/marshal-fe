import { create } from "zustand";
import type { Actor, Role } from "@/lib/schemas";

interface AuthState {
  actor: Actor | null;
  token: string | null;
  setActor: (actor: Actor | null) => void;
  setToken: (token: string | null) => void;
  clear: () => void;
  hasRole: (...roles: Role[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  actor: null,
  token: null,
  setActor: (actor) => set({ actor }),
  setToken: (token) => set({ token }),
  clear: () => set({ actor: null, token: null }),
  hasRole: (...roles) => {
    const role = get().actor?.role;
    return role ? roles.includes(role) : false;
  },
  hasPermission: (permission) => {
    const actor = get().actor;
    if (!actor) return false;
    return actor.permissions.includes("*") || actor.permissions.includes(permission);
  },
}));
