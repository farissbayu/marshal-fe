import { Outlet } from "@tanstack/react-router";

export function AppShell() {
  return (
    <div className="h-full overflow-y-auto bg-bg">
      <Outlet />
    </div>
  );
}
