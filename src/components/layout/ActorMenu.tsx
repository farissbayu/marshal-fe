import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchMockActor } from "@/lib/api";
import { IS_DEVELOPMENT } from "@/lib/env";
import { roleLabel } from "@/lib/role";
import type { Role } from "@/lib/schemas";
import { useAppStore } from "@/lib/stores/app";
import { useAuthStore } from "@/lib/stores/auth";

export function ActorMenu() {
  const actor = useAuthStore((s) => s.actor);
  const setActor = useAuthStore((s) => s.setActor);
  const mockMode = useAppStore((s) => s.mockMode);
  const queryClient = useQueryClient();

  if (!actor) return null;

  const canSwitch = IS_DEVELOPMENT && mockMode;

  const handleSwitch = async (role: Role) => {
    try {
      const next = await switchMockActor(role);
      setActor(next);
      await queryClient.invalidateQueries();
    } catch {
      // ignore switch failure in dev
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2" aria-label="Identitas actor">
          <UserCircle2 className="size-4" aria-hidden />
          <span className="hidden max-w-32 truncate sm:inline">{actor.display_name}</span>
          <span className="hidden text-xs text-fg-subtle md:inline">· {roleLabel(actor.role)}</span>
          {canSwitch && <ChevronDown className="size-3" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {actor.display_name}
          <span className="block font-mono text-[10px] font-normal text-fg-subtle">
            {actor.actor_id} · {actor.role}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-fg-subtle">
          Permissions
        </div>
        <div className="max-w-56 px-2 pb-1 text-[11px] text-fg-muted">
          {actor.permissions.length ? actor.permissions.join(", ") : "—"}
        </div>
        {canSwitch && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Ganti actor (dev only)</DropdownMenuLabel>
            {(["supervisor", "inspector", "worker", "engineer"] as Role[]).map((role) => (
              <DropdownMenuItem key={role} onSelect={() => handleSwitch(role)}>
                <Check
                  className={`size-3.5 ${actor.role === role ? "opacity-100" : "opacity-0"}`}
                  aria-hidden
                />
                {roleLabel(role)}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
