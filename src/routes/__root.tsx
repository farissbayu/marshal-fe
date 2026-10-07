import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/lib/env";

export const Route = createRootRoute({
  head: () => ({ meta: [{ title: APP_TITLE }] }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return <AppShell />;
}

function NotFound() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-center">
      <Compass className="size-8 text-fg-subtle" aria-hidden />
      <div>
        <h1 className="text-lg font-semibold text-fg">Halaman tidak ditemukan</h1>
        <p className="text-sm text-fg-muted">
          Route yang Anda tuju tidak tersedia di control tower.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link to="/overview">Kembali ke Overview</Link>
      </Button>
    </div>
  );
}

export { Outlet };
