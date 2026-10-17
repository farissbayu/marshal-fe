import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  GitBranch,
  LifeBuoy,
  Warehouse,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Overview } from "@/lib/schemas";

interface SystemPipelineOverviewProps {
  overview?: Overview;
  loading?: boolean;
}

export function SystemPipelineOverview({ overview, loading }: SystemPipelineOverviewProps) {
  const cars = overview?.cars;
  const byState = cars?.by_state ?? {};

  // Group vehicle states into pipeline stages
  const dispatchCount = (byState.waiting_dispatch ?? 0) + (byState.parked ?? 0);
  const inspectingCount = byState.inspecting ?? 0;
  const drivingCount = byState.driving ?? 0;
  const readyCount = byState.ready ?? 0;
  const reworkCount = byState.rework ?? 0;
  const exceptionCount = (cars?.exception ?? 0) + (cars?.held ?? 0);
  const assistanceOpen = overview?.assistance_open ?? 0;

  return (
    <Card className="border-border bg-surface">
      <CardHeader className="border-b border-border/80 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <GitBranch className="size-4" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold text-fg">
                End-to-End System Pipeline
              </CardTitle>
              <p className="text-xs text-fg-muted">
                Vehicle flow: Intake lane &rarr; Visual inspection &rarr; Functional test &rarr;
                Ready for dispatch (including incident escalation)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-fg-subtle">Total Fleet:</span>
            <span className="font-mono font-semibold text-fg">
              {loading ? "..." : (cars?.total ?? 0)} units
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Main 4-Stage Linear Flow */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Station 1: Yard & Dispatch */}
          <div className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-3 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  <Warehouse className="size-3.5" />
                  1. Intake & Yard
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Intake
                </Badge>
              </div>
              <p className="mt-1 text-xs text-fg-muted">Automated movement routes & missions</p>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-[11px] text-fg-subtle">Waiting/Parked</span>
              <span className="font-mono text-base font-semibold text-fg">
                {loading ? "..." : dispatchCount}
              </span>
            </div>
          </div>

          {/* Station 2: Visual Gate */}
          <div className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-3 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  <Camera className="size-3.5" />
                  2. Visual Gate
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Optical Scan
                </Badge>
              </div>
              <p className="mt-1 text-xs text-fg-muted">Defect detection & build sheet matching</p>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-[11px] text-fg-subtle">Under Inspection</span>
              <span className="font-mono text-base font-semibold text-fg">
                {loading ? "..." : inspectingCount}
              </span>
            </div>
          </div>

          {/* Station 3: Functional Check */}
          <div className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-3 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                  <Activity className="size-3.5" />
                  3. Test Track
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Dynamics
                </Badge>
              </div>
              <p className="mt-1 text-xs text-fg-muted">Check telemetry vs track CCTV cameras</p>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-[11px] text-fg-subtle">Drive Test / Maneuvers</span>
              <span className="font-mono text-base font-semibold text-fg">
                {loading ? "..." : drivingCount}
              </span>
            </div>
          </div>

          {/* Station 4: Ready for Delivery */}
          <div className="group relative flex flex-col justify-between rounded-lg border border-border bg-surface-2 p-3 transition-colors">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
                  <CheckCircle2 className="size-3.5" />
                  4. Pass & Ready
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Passed
                </Badge>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Full inspection PASS, staged for transport dispatch
              </p>
            </div>
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-2">
              <span className="text-[11px] text-fg-subtle">Ready for Dispatch</span>
              <span className="font-mono text-base font-semibold text-success">
                {loading ? "..." : readyCount}
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly & Closed Loop Branches */}
        <div className="grid gap-2 sm:grid-cols-2">
          {/* Branch A: Remediation / Rework Bay */}
          <div className="flex items-start justify-between rounded-md border border-warning/30 bg-warning/5 p-3 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Wrench className="size-4 text-warning shrink-0" />
                <span className="text-xs font-semibold text-fg">Rework & Remediation Bays</span>
                <Badge variant="warning" className="text-[10px]">
                  {reworkCount} in repair bays
                </Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                Defective vehicles routed to dedicated bays (paint, electrical, mechanical).
                Re-inspection targets failed items.
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 text-warning shrink-0 ml-2" />
          </div>

          {/* Branch B: Stuck Car -> Assistance -> Test Lab Closed Loop */}
          <div className="flex items-start justify-between rounded-md border border-danger/30 bg-danger/5 p-3 transition-colors">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-danger shrink-0" />
                <span className="text-xs font-semibold text-fg">
                  Safety Intervention & Test Lab Regression
                </span>
                <Badge
                  variant={assistanceOpen > 0 || exceptionCount > 0 ? "danger" : "outline"}
                  className="text-[10px]"
                >
                  {assistanceOpen} need assistance{" "}
                  {exceptionCount > 0 ? `· ${exceptionCount} held` : ""}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                Obstacle hold &rarr; Human decision unblocks vehicle &rarr; Incident exported to
                Test Lab for safety regression.
              </p>
            </div>
            <ArrowRight className="mt-1 size-4 text-danger shrink-0 ml-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
