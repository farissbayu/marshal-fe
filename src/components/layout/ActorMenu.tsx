import { UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/lib/stores/auth";

export function ActorMenu() {
  const actor = useAuthStore((s) => s.actor);

  if (!actor) return null;

  return (
    <Badge variant="outline" className="gap-1.5">
      <UserCircle2 className="size-3.5" aria-hidden />
      <span className="max-w-32 truncate font-medium text-fg">{actor.display_name}</span>
    </Badge>
  );
}
