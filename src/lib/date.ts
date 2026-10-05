const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" for a calendar day - the key every per-day map uses.
export const dayKey = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

// The UTC day key of a Date.
export const utcDayKey = (d: Date) => dayKey(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

// ISO timestamp -> value for <input type="datetime-local">, kept in UTC.
export function toUtcInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${utcDayKey(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// Format a "YYYY-MM-DD" (UTC) key as a short, human label like "Jun 9".
export function fmtShortDate(key?: string): string {
  if (!key) return "";
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Whole days from now until an ISO timestamp (negative if already past).
// Returns null for an empty/invalid input.
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor((t - Date.now()) / 86400000);
}

export function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
