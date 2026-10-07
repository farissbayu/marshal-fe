import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Send, Square } from "lucide-react";
import { useState } from "react";
import { ConfirmActionDialog } from "@/components/common/ConfirmActionDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { holdCar, resumeCar, sendMission } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import type { CarSummary } from "@/lib/schemas";

type Action = "mission" | "hold" | "resume" | null;

export function VehicleActions({ car, compact }: { car: CarSummary; compact?: boolean }) {
  const [action, setAction] = useState<Action>(null);
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["yard"] }),
      queryClient.invalidateQueries({ queryKey: ["car", car.vin] }),
      queryClient.invalidateQueries({ queryKey: ["cars"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  };

  const mission = useMutation({
    mutationFn: (input: { destination: string; reason?: string }) => sendMission(car.vin, input),
    onSuccess: async () => {
      await invalidate();
      setAction(null);
    },
  });
  const hold = useMutation({
    mutationFn: (input: { reason: string; duration_minutes?: number }) => holdCar(car.vin, input),
    onSuccess: async () => {
      await invalidate();
      setAction(null);
    },
  });
  const resume = useMutation({
    mutationFn: () => resumeCar(car.vin),
    onSuccess: async () => {
      await invalidate();
      setAction(null);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {car.state !== "held" && car.state !== "driving" && (
        <Button size="sm" variant="secondary" onClick={() => setAction("mission")}>
          <Send className="size-3.5" /> Misi
        </Button>
      )}
      {car.state !== "held" && (
        <Button size="sm" variant="secondary" onClick={() => setAction("hold")}>
          <Square className="size-3.5" /> Hold
        </Button>
      )}
      {car.state === "held" && (
        <Button size="sm" variant="success" onClick={() => setAction("resume")}>
          <Play className="size-3.5" /> Resume
        </Button>
      )}
      {compact && null}

      <MissionDialog
        open={action === "mission"}
        onOpenChange={(o) => !o && setAction(null)}
        car={car}
        pending={mission.isPending}
        error={mission.error}
        onSubmit={(input) => mission.mutate(input)}
      />
      <HoldDialog
        open={action === "hold"}
        onOpenChange={(o) => !o && setAction(null)}
        car={car}
        pending={hold.isPending}
        error={hold.error}
        onSubmit={(input) => hold.mutate(input)}
      />
      <ConfirmActionDialog
        open={action === "resume"}
        onOpenChange={(o) => !o && setAction(null)}
        title="Lanjutkan kendaraan?"
        description={
          <span>
            Kendaraan <span className="font-mono text-fg">{car.vin}</span> akan dilepas dari status
            held dan kembali ke antrean dispatch.
          </span>
        }
        confirmLabel="Lanjutkan"
        variant="success"
        pending={resume.isPending}
        onConfirm={() => resume.mutate()}
      />
    </div>
  );
}

function MissionDialog({
  open,
  onOpenChange,
  car,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: CarSummary;
  pending: boolean;
  error: unknown;
  onSubmit: (input: { destination: string; reason?: string }) => void;
}) {
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim misi kendaraan</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-fg">{car.vin}</span> · lokasi sekarang {car.location}.
            Backend tetap memvalidasi aksi terhadap state terkini.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="mission-dest">Tujuan</Label>
            <Input
              id="mission-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="mis. TRACK-1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mission-reason">Alasan (opsional)</Label>
            <Textarea
              id="mission-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          {error != null && <p className="text-xs text-danger">{getErrorMessage(error)}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            disabled={pending || destination.trim().length === 0}
            onClick={() => onSubmit({ destination, reason: reason || undefined })}
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Konfirmasi misi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HoldDialog({
  open,
  onOpenChange,
  car,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  car: CarSummary;
  pending: boolean;
  error: unknown;
  onSubmit: (input: { reason: string; duration_minutes?: number }) => void;
}) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tahan kendaraan</DialogTitle>
          <DialogDescription>
            Kendaraan <span className="font-mono text-fg">{car.vin}</span> akan masuk status held
            sampai di-resume.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="hold-reason">Alasan</Label>
            <Textarea
              id="hold-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hold-duration">Durasi (menit, opsional)</Label>
            <Input
              id="hold-duration"
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          {error != null && <p className="text-xs text-danger">{getErrorMessage(error)}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            variant="warning"
            disabled={pending || reason.trim().length === 0}
            onClick={() =>
              onSubmit({
                reason,
                duration_minutes: duration ? Number(duration) : undefined,
              })
            }
          >
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Tahan kendaraan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
