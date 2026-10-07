import { useQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { fetchHealth, fetchMe, fetchReadiness } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { useAppStore } from "@/lib/stores/app";
import { useAuthStore } from "@/lib/stores/auth";
import { useEventStream } from "@/lib/use-event-stream";
import { useOnlineStatus, usePollingEnabled } from "@/lib/use-polling";
import { cn } from "@/lib/utils";

function useBootstrap() {
  const pollingEnabled = usePollingEnabled();
  const setApiStatus = useAppStore((s) => s.setApiStatus);
  const setActor = useAuthStore((s) => s.setActor);
  const clearAuth = useAuthStore((s) => s.clear);

  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: pollingEnabled ? 15_000 : false,
    retry: 1,
  });
  const readiness = useQuery({
    queryKey: ["readyz"],
    queryFn: fetchReadiness,
    refetchInterval: pollingEnabled ? 20_000 : false,
    retry: 1,
  });
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: 0 });

  useEffect(() => {
    if (me.data) setActor(me.data);
    if (me.error instanceof ApiError && me.error.kind === "unauthorized") clearAuth();
  }, [me.data, me.error, setActor, clearAuth]);

  useEffect(() => {
    if (health.isError) {
      setApiStatus("offline");
      return;
    }
    if (readiness.isError || readiness.data?.status === "not_ready") {
      setApiStatus("degraded");
      return;
    }
    if (health.data?.status === "degraded") {
      setApiStatus("degraded");
      return;
    }
    if (health.isSuccess) setApiStatus("connected");
  }, [
    health.isError,
    health.data,
    health.isSuccess,
    readiness.isError,
    readiness.data,
    setApiStatus,
  ]);
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const online = useAppStore((s) => s.online);

  useBootstrap();
  useOnlineStatus();
  useEventStream();

  return (
    <div className="flex h-full min-h-0 bg-bg">
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup navigasi"
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 z-50">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        {!online && (
          <div
            role="alert"
            className="border-b border-danger/40 bg-danger/15 px-4 py-1.5 text-center text-xs text-danger"
          >
            Koneksi terputus — menampilkan data terakhir yang tersedia. Polling dijeda.
          </div>
        )}
        <main className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-6")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
