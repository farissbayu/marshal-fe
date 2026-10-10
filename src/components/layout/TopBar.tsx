import { Link } from "@tanstack/react-router";
import { Menu, PanelLeft, Sparkles } from "lucide-react";
import { Freshness } from "@/components/common/Freshness";
import { ActorMenu } from "@/components/layout/ActorMenu";
import { ConnectionStatus } from "@/components/layout/ConnectionStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/lib/env";
import { useAppStore } from "@/lib/stores/app";

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const mockMode = useAppStore((s) => s.mockMode);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-3 sm:px-4">
      <Button
        size="icon-sm"
        variant="ghost"
        className="lg:hidden"
        aria-label="Buka navigasi"
        onClick={onOpenMobileNav}
      >
        <Menu className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        className="hidden lg:inline-flex"
        aria-label={collapsed ? "Perluas sidebar" : "Perkecil sidebar"}
        onClick={toggleSidebar}
      >
        <PanelLeft className="size-4" />
      </Button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{APP_TITLE}</p>
        <p className="truncate text-[10px] uppercase tracking-wide text-fg-subtle">
          Plant 01 · Pasuruan
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Button asChild size="sm" variant="secondary" className="hidden gap-1.5 md:inline-flex">
          <Link to="/overview">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span className="text-xs">Demo Flow</span>
          </Link>
        </Button>
        {mockMode && (
          <Badge variant="warning" className="hidden font-mono sm:inline-flex">
            MOCK MODE
          </Badge>
        )}
        <ConnectionStatus />
        <div className="hidden items-center gap-1 text-xs text-fg-subtle md:flex">
          <span>Diperbarui</span>
          <Freshness />
        </div>
        <ActorMenu />
      </div>
    </header>
  );
}
