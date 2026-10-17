import { Freshness } from "@/components/common/Freshness";
import { ActorMenu } from "@/components/layout/ActorMenu";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE } from "@/lib/env";
import { useAppStore } from "@/lib/stores/app";

export function TopBar() {
  const mockMode = useAppStore((s) => s.mockMode);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{APP_TITLE}</p>
        <p className="truncate text-[10px] uppercase tracking-wide text-fg-subtle">
          Plant 01 · Pasuruan
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {mockMode && (
          <Badge variant="warning" className="hidden font-mono sm:inline-flex">
            MOCK MODE
          </Badge>
        )}
        <ConnectionStatus />
        <div className="hidden items-center gap-1 text-xs text-fg-subtle md:flex">
          <span>Updated</span>
          <Freshness />
        </div>
        <ActorMenu />
      </div>
    </header>
  );
}
