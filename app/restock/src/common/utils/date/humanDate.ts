import { formatDistanceToNowStrict, format } from "date-fns";

const SUFFIX_MAP: Record<string, string> = {
  second: "s",
  seconds: "s",
  minute: "min",
  minutes: "mins",
  hour: "hr",
  hours: "hrs",
  day: "d",
  days: "d",
  month: "mo",
  months: "mo",
  year: "yr",
  years: "yrs",
};

/**
 * Compact, friendly relative date.
 *
 *   5 mins ago / 20 hrs ago / 3 d ago / 2 mo ago
 *   (when older than 7 days, also tacks on the wall-clock time)
 *
 * "ago" / "from now" suffix preserved for clarity.
 */
export default function humanDate(date: string | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const diffMs = Date.now() - d.getTime();
  const isFuture = diffMs < 0;
  const diffSec = Math.abs(diffMs) / 1000;
  if (diffSec < 30) return "just now";

  // formatDistanceToNowStrict yields strings like "5 minutes" or "1 hour".
  const raw = formatDistanceToNowStrict(d); // "5 minutes", "1 hour", "3 days", "2 months"
  const [n, unit] = raw.split(" ");
  const short = `${n} ${SUFFIX_MAP[unit] ?? unit}`;
  const suffix = isFuture ? "from now" : "ago";

  // For older items add the time of day so "5 mo ago" is still actionable
  const diffDays = diffSec / 86400;
  if (diffDays >= 7) {
    return `${short} ${suffix} · ${format(d, "HH:mm")}`;
  }
  return `${short} ${suffix}`;
}
