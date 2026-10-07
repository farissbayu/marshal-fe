import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ActorBadge } from "@/components/common/ActorBadge";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { decideProposal } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { roleLabel } from "@/lib/role";
import { useAuthStore } from "@/lib/stores/auth";

interface ReviewOption {
  decision: string;
  label: string;
  variant: "default" | "danger" | "success" | "warning";
}

const OPTIONS: Record<string, ReviewOption[]> = {
  inspection_review: [
    { decision: "confirm", label: "Konfirmasi Review", variant: "success" },
    { decision: "escalate", label: "Eskalasi", variant: "warning" },
  ],
  rework: [
    { decision: "confirm", label: "Konfirmasi Rework", variant: "success" },
    { decision: "reject", label: "Tolak Rework", variant: "danger" },
  ],
  replan: [
    { decision: "approve", label: "Setujui Re-plan", variant: "success" },
    { decision: "reject", label: "Tolak Re-plan", variant: "danger" },
  ],
};

export function ReviewForm({
  proposalId,
  kind,
  title = "Form Review",
  onSuccess,
}: {
  proposalId: string;
  kind: keyof typeof OPTIONS | string;
  title?: string;
  onSuccess?: () => void;
}) {
  const actor = useAuthStore((s) => s.actor);
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const options = OPTIONS[kind] ?? OPTIONS.inspection_review;

  const mutation = useMutation({
    mutationFn: (decision: string) =>
      decideProposal(proposalId, {
        decision,
        actor_id: actor?.actor_id ?? "",
        note: note || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      onSuccess?.();
    },
  });

  return (
    <div className="space-y-3 rounded-md border border-warning/40 bg-warning/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-fg">{title}</h4>
        <ActorBadge actorId={actor?.actor_id} role={actor ? roleLabel(actor.role) : undefined} />
      </div>
      <p className="text-xs text-fg-subtle">
        Keputusan dikirim atas identitas sesi Anda. Backend memvalidasi otorisasi.
      </p>
      <div className="space-y-1">
        <Label htmlFor={`note-${proposalId}`}>Catatan (opsional)</Label>
        <Textarea
          id={`note-${proposalId}`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={mutation.isPending}
        />
      </div>
      {mutation.isError && <p className="text-xs text-danger">{getErrorMessage(mutation.error)}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.decision}
            variant={option.variant}
            size="sm"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(option.decision)}
          >
            {mutation.isPending && mutation.variables === option.decision && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            )}
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function ReviewCompleted({
  decision,
  actorId,
}: {
  decision?: string | null;
  actorId?: string | null;
}) {
  return (
    <div className="rounded-md border border-success/40 bg-success/10 p-3 text-xs text-fg-muted">
      Review selesai: <span className="font-mono text-fg">{decision ?? "—"}</span>
      {actorId && (
        <>
          {" "}
          oleh <ActorBadge actorId={actorId} />
        </>
      )}
    </div>
  );
}
