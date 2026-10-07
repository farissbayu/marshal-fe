import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

export interface StatusMeta {
  label: string;
  variant: BadgeVariant;
  icon?: string;
}

const GENERIC: Record<string, StatusMeta> = {
  PASS: { label: "PASS", variant: "success", icon: "✓" },
  REVIEW: { label: "REVIEW", variant: "warning", icon: "⚠" },
  FAIL: { label: "FAIL", variant: "danger", icon: "✕" },
  PENDING: { label: "PENDING", variant: "warning", icon: "◷" },
  DONE: { label: "DONE", variant: "success", icon: "✓" },
  ESCALATED: { label: "ESCALATED", variant: "danger", icon: "▲" },
  OPEN: { label: "OPEN", variant: "warning", icon: "●" },
  RESOLVED: { label: "RESOLVED", variant: "success", icon: "✓" },
  IN_REPAIR: { label: "IN_REPAIR", variant: "info", icon: "⚙" },
  WAITING_REINSPECTION: { label: "WAITING_REINSPECTION", variant: "warning", icon: "◷" },
  WAITING: { label: "WAITING", variant: "warning", icon: "◷" },
  NOT_REQUIRED: { label: "NOT_REQUIRED", variant: "neutral", icon: "–" },
  approved: { label: "APPROVED", variant: "success", icon: "✓" },
  rejected: { label: "REJECTED", variant: "danger", icon: "✕" },
  pending: { label: "PENDING", variant: "warning", icon: "◷" },
  pending_review: { label: "PENDING REVIEW", variant: "warning", icon: "◷" },
  dry_run_running: { label: "DRY-RUN", variant: "warning", icon: "⚙" },
  draft: { label: "DRAFT", variant: "neutral", icon: "✎" },
  runnable: { label: "RUNNABLE", variant: "info", icon: "▶" },
  approved_gate: { label: "APPROVED", variant: "success", icon: "✓" },
  blocked: { label: "BLOCKED", variant: "danger", icon: "⛔" },
  none: { label: "NOT EVALUATED", variant: "neutral", icon: "–" },
  running: { label: "RUNNING", variant: "info", icon: "⚙" },
  queued: { label: "QUEUED", variant: "neutral", icon: "◷" },
  done: { label: "DONE", variant: "success", icon: "✓" },
  failed: { label: "FAILED", variant: "danger", icon: "✕" },
  timeout: { label: "TIMEOUT", variant: "danger", icon: "⏱" },
  unknown: { label: "UNKNOWN", variant: "neutral", icon: "?" },
  new: { label: "NEW", variant: "neutral", icon: "＋" },
  processing: { label: "PROCESSING", variant: "warning", icon: "⚙" },
  converted: { label: "CONVERTED", variant: "success", icon: "✓" },
  connected: { label: "CONNECTED", variant: "success", icon: "●" },
  degraded: { label: "DEGRADED", variant: "warning", icon: "●" },
  offline: { label: "OFFLINE", variant: "danger", icon: "●" },
  live: { label: "LIVE", variant: "success", icon: "●" },
  reconnecting: { label: "RECONNECTING", variant: "warning", icon: "●" },
};

export const CAR_STATE_LABEL: Record<string, string> = {
  parked: "Parked",
  driving: "Driving",
  held: "Held",
  waiting_dispatch: "Waiting Dispatch",
  inspecting: "Inspecting",
  rework: "Rework",
  ready: "Ready",
  exception: "Exception",
};

export function statusMeta(status: string): StatusMeta {
  return GENERIC[status] ?? { label: status.toUpperCase(), variant: "default" };
}

export function carStateMeta(state: string): StatusMeta {
  const map: Record<string, BadgeVariant> = {
    parked: "neutral",
    driving: "info",
    held: "warning",
    waiting_dispatch: "warning",
    inspecting: "info",
    rework: "warning",
    ready: "success",
    exception: "danger",
  };
  return { label: CAR_STATE_LABEL[state] ?? state, variant: map[state] ?? "default" };
}

export function severityVariant(level: string): BadgeVariant {
  switch (level) {
    case "good":
      return "success";
    case "warn":
      return "warning";
    case "bad":
      return "danger";
    default:
      return "info";
  }
}

export function waitingTone(minutes: number): BadgeVariant {
  if (minutes >= 30) return "danger";
  if (minutes >= 10) return "warning";
  return "neutral";
}

export function jobTone(status: string): BadgeVariant {
  return statusMeta(status).variant;
}
