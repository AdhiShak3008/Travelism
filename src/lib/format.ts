export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Get a sensible default upcoming departure date (2 weeks from today) YYYY-MM-DD */
export function getDefaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split("T")[0];
}

/** Add days to a YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

/** Formats a date string into "Oct 15, 2026" */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "Flexible Dates";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

/** Formats date range: "Oct 15 – Oct 22, 2026" */
export function formatDateRange(startStr?: string, durationDays = 7): string {
  const start = startStr || getDefaultStartDate();
  try {
    const d1 = new Date(start);
    if (isNaN(d1.getTime())) return `${durationDays} Days`;
    const d2 = new Date(d1);
    d2.setDate(d2.getDate() + Math.max(1, durationDays - 1));

    const m1 = d1.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const m2 = d2.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${m1} – ${m2}`;
  } catch {
    return `${durationDays} Days`;
  }
}

/** Formats day calendar header: "Wed, Oct 15" */
export function formatDayDate(startStr?: string, dayNumber = 1): string {
  const start = startStr || getDefaultStartDate();
  try {
    const d = new Date(start);
    if (isNaN(d.getTime())) return `Day ${dayNumber}`;
    d.setDate(d.getDate() + (dayNumber - 1));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return `Day ${dayNumber}`;
  }
}
