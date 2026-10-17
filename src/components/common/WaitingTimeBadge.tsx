import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { waitingMinutes } from "@/lib/format";
import { waitingTone } from "@/lib/status";

export function WaitingTimeBadge({ createdAt }: { createdAt: string }) {
  const minutes = waitingMinutes(createdAt);
  const label =
    minutes < 1 ? "< 1 min" : minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h`;
  return (
    <Badge variant={waitingTone(minutes)}>
      <Clock className="size-3" aria-hidden />
      <span className="tabular">{label}</span>
    </Badge>
  );
}
