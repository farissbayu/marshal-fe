import { AlertTriangle } from "lucide-react";
import { EvidenceViewer } from "@/components/common/EvidenceViewer";
import { InspectionVerdictBadge } from "@/components/common/StatusBadge";
import { ReviewCompleted, ReviewForm } from "@/components/domain/ReviewForm";
import { formatDateTime } from "@/lib/format";
import type { VisualInspection } from "@/lib/schemas";

export function VisualInspectionPanel({ inspection }: { inspection: VisualInspection }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <InspectionVerdictBadge verdict={inspection.verdict} />
        <span className="text-xs text-fg-muted">Waktu: {formatDateTime(inspection.at)}</span>
        <span className="text-xs text-fg-subtle">{inspection.findings.length} temuan</span>
      </div>

      {inspection.findings.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-2 p-3 text-sm text-fg-muted">
          Tidak ada temuan visual.
        </p>
      ) : (
        <div className="space-y-3">
          {inspection.findings.map((finding, index) => (
            <div
              key={`${finding.zone}-${index}`}
              className="grid gap-3 rounded-md border border-border bg-surface-2 p-3 sm:grid-cols-[1fr_12rem]"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-fg">{finding.zone}</span>
                  <span className="text-xs text-fg-muted">{finding.defect_type}</span>
                  {finding.size && <span className="text-xs text-fg-subtle">· {finding.size}</span>}
                  <span className="text-xs text-fg-subtle">
                    · conf {Math.round(finding.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-fg-muted">{finding.observation}</p>
              </div>
              {finding.media_id ? (
                <EvidenceViewer mediaId={finding.media_id} label={finding.zone} compact />
              ) : (
                <div className="flex items-center justify-center rounded-md border border-dashed border-border text-[11px] text-fg-subtle">
                  Tanpa bukti media
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inspection.mismatches.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg">
            <AlertTriangle className="size-4 text-warning" aria-hidden />
            Build Sheet Mismatch
          </p>
          <div className="space-y-1">
            {inspection.mismatches.map((mismatch) => (
              <p key={mismatch.attribute} className="text-xs text-fg-muted">
                <span className="font-mono uppercase">{mismatch.attribute}</span>: expected{" "}
                <span className="text-fg">{mismatch.expected}</span>, found{" "}
                <span className="text-warning">{mismatch.found}</span> · conf{" "}
                {Math.round(mismatch.confidence * 100)}%
              </p>
            ))}
          </div>
        </div>
      )}

      {inspection.review_status === "PENDING" && inspection.proposal_id ? (
        <ReviewForm
          proposalId={inspection.proposal_id}
          kind="inspection_review"
          title="Form Review Inspeksi Visual"
        />
      ) : inspection.review_status === "PENDING" ? (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-fg-muted">
          Review menunggu proposal review dari backend. UI tidak dapat menyatakan PASS/FAIL tanpa
          keputusan backend.
        </div>
      ) : (
        <ReviewCompleted decision={inspection.review_decision} actorId={inspection.reviewed_by} />
      )}
    </div>
  );
}
