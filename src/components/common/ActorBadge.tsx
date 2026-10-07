import { UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/lib/schemas";

export function ActorBadge({ actorId, role }: { actorId?: string | null; role?: Role | string }) {
  if (!actorId) return <span className="text-xs text-fg-subtle">—</span>;
  return (
    <Badge variant="outline" className="gap-1.5">
      <UserCircle2 className="size-3" aria-hidden />
      <span className="font-mono">{actorId}</span>
      {role && <span className="text-fg-subtle">· {role}</span>}
    </Badge>
  );
}
