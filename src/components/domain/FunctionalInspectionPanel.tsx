import { AlertTriangle, Check, X } from "lucide-react";
import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { InspectionVerdictBadge } from "@/components/common/StatusBadge";
import { ReviewCompleted, ReviewForm } from "@/components/domain/ReviewForm";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { FunctionalInspection } from "@/lib/schemas";

export function FunctionalInspectionPanel({ inspection }: { inspection: FunctionalInspection }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <InspectionVerdictBadge verdict={inspection.verdict} />
        <span className="text-xs text-fg-muted">Waktu: {formatDateTime(inspection.at)}</span>
        <span className="text-xs text-fg-subtle">
          {inspection.steps.filter((s) => s.disagree).length} disagreement
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-surface-2">
              <TableHead className="w-12">Step</TableHead>
              <TableHead>Nama Check</TableHead>
              <TableHead>Telemetry</TableHead>
              <TableHead>Kamera</TableHead>
              <TableHead>Conf</TableHead>
              <TableHead className="hidden lg:table-cell">Observasi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inspection.steps.map((step) => (
              <TableRow key={step.step} className={step.disagree ? "bg-danger/5" : undefined}>
                <TableCell className="tabular">{step.step}</TableCell>
                <TableCell className="text-fg">
                  <div className="flex items-center gap-2">
                    {step.name}
                    {step.disagree && (
                      <Badge variant="danger" className="gap-1">
                        <AlertTriangle className="size-3" aria-hidden /> DISAGREE
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular">
                  <span className="inline-flex items-center gap-1">
                    {step.telemetry?.toLowerCase().includes("no data") ? (
                      <X className="size-3.5 text-danger" aria-hidden />
                    ) : (
                      <Check className="size-3.5 text-success" aria-hidden />
                    )}
                    {step.telemetry ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="tabular">{step.camera_result ?? "—"}</TableCell>
                <TableCell className="tabular">{Math.round(step.confidence * 100)}%</TableCell>
                <TableCell className="hidden max-w-xs text-xs lg:table-cell">
                  {step.observation || "—"}
                  {step.media_id && (
                    <div className="mt-1 max-w-40">
                      <EvidenceViewer mediaId={step.media_id} compact />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {inspection.review_status === "PENDING" && inspection.proposal_id ? (
        <ReviewForm
          proposalId={inspection.proposal_id}
          kind="inspection_review"
          title="Form Review Inspeksi Fungsional"
        />
      ) : inspection.review_status === "PENDING" ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-fg-muted">
          Review menunggu proposal dari backend.
        </div>
      ) : (
        <ReviewCompleted decision={inspection.review_decision} actorId={inspection.reviewed_by} />
      )}
    </div>
  );
}
