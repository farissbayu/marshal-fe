import { Link, useRouterState } from "@tanstack/react-router";
import { Gauge } from "lucide-react";
import { Icon } from "@/components/common/Icon";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

function isActive(pathname: string, to: string): boolean {
  if (to === "/cars") return pathname === "/cars" || pathname.startsWith("/cars/");
  if (to === "/quality/inspections") return pathname.startsWith("/quality");
  if (to === "/lab") return pathname.startsWith("/lab");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Sidebar({
  collapsed,
  onNavigate,
  className,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-surface",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Gauge className="size-5 shrink-0 text-primary" aria-hidden />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">Marshal</p>
            <p className="truncate text-[10px] uppercase tracking-wide text-fg-subtle">
              Control Tower
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Navigasi utama">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon icon={item.icon} className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-border p-3 text-[10px] text-fg-subtle">
          <p>Operasional · Plant 01</p>
          <p className="font-mono">v0.1.0</p>
        </div>
      )}
    </aside>
  );
}
