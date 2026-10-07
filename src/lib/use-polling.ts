import { useEffect, useState } from "react";
import { useAppStore } from "./stores/app";

export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}

/** Registers global online/offline listeners and mirrors them into the app store. */
export function useOnlineStatus(): void {
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnline]);
}

/**
 * True when background polling should run: tab visible and browser online.
 * Used to drive TanStack Query `refetchInterval`, so polling stops when the
 * operator switches tabs or loses connectivity.
 */
export function usePollingEnabled(): boolean {
  const visible = useDocumentVisible();
  const online = useAppStore((s) => s.online);
  return visible && online;
}
