import { formatRelative } from "@/lib/format";
import { useAppStore } from "@/lib/stores/app";

export function Freshness({ at }: { at?: number | null }) {
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  const value = at ?? lastUpdated;
  if (!value) return <span className="text-fg-subtle">Belum ada data</span>;
  return (
    <span className="tabular text-fg-muted" title={new Date(value).toISOString()}>
      {formatRelative(value)}
    </span>
  );
}
