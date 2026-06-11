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
