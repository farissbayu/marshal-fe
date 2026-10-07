const TIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "UTC",
});

export function formatClock(iso: string | number | Date): string {
  const date = toDate(iso);
  return date ? TIME_FORMAT.format(date) : "--:--:--";
}

export function formatDateTime(iso: string | number | Date): string {
  const date = toDate(iso);
  return date ? DATE_TIME_FORMAT.format(date) : "-";
}

export function formatRelative(iso: string | number | Date, now = Date.now()): string {
  const date = toDate(iso);
  if (!date) return "-";
  const diffMs = now - date.getTime();
  const mins = Math.floor(Math.abs(diffMs) / 60000);
  const suffix = diffMs >= 0 ? "lalu" : "lagi";
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt ${suffix}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam ${suffix}`;
  const days = Math.floor(hours / 24);
  return `${days} hari ${suffix}`;
}

export function waitingMinutes(iso: string, now = Date.now()): number {
  const date = toDate(iso);
  if (!date) return 0;
  return Math.max(0, Math.floor((now - date.getTime()) / 60000));
}

export function formatNumber(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
  return unit
    ? `${formatted}${unit.startsWith("%") || unit.startsWith("x") ? "" : " "}${unit}`
    : formatted;
}

export function toDate(iso: string | number | Date): Date | null {
  if (iso instanceof Date) return Number.isNaN(iso.getTime()) ? null : iso;
  if (typeof iso === "number") return new Date(iso);
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
