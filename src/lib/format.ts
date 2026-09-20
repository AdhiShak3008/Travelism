import { useAuth } from "@/store/authStore";

export type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP" | "JPY" | "AED";

// Standard market exchange rates against base INR:
export const FX_RATES_FROM_INR: Record<SupportedCurrency, number> = {
  INR: 1,
  USD: 1 / 87, // ~0.01149 (e.g. ₹2,800 ≈ $32)
  EUR: 1 / 95, // ~0.01053 (e.g. ₹2,800 ≈ €29)
  GBP: 1 / 112, // ~0.00893 (e.g. ₹2,800 ≈ £25)
  JPY: 1.72, // ~1.72 (e.g. ₹2,800 ≈ ¥4,816)
  AED: 1 / 23.7, // ~0.04219 (e.g. ₹2,800 ≈ AED 118)
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AED: "AED ",
};

export function getActiveCurrency(): SupportedCurrency {
  try {
    const userCurrency = useAuth.getState().user?.preferences?.currency;
    if (userCurrency && userCurrency in FX_RATES_FROM_INR) {
      return userCurrency as SupportedCurrency;
    }
    if (typeof window !== "undefined") {
      const prefsRaw = localStorage.getItem("travelism_user_preferences_v1");
      if (prefsRaw) {
        const p = JSON.parse(prefsRaw);
        if (p?.currency && p.currency in FX_RATES_FROM_INR) return p.currency as SupportedCurrency;
      }
      const sessionRaw = localStorage.getItem("travelism_active_session_v1") || localStorage.getItem("travelism_active_session");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        const c = session?.user?.preferences?.currency;
        if (c && c in FX_RATES_FROM_INR) return c as SupportedCurrency;
      }
    }
  } catch {}
  return "INR";
}

export function formatPrice(amountInInr: number, currency?: SupportedCurrency): string {
  if (typeof amountInInr !== "number" || isNaN(amountInInr)) return "—";
  const curr = currency || getActiveCurrency();
  const rate = FX_RATES_FROM_INR[curr] ?? 1;
  const symbol = CURRENCY_SYMBOLS[curr] ?? "₹";
  const converted = amountInInr * rate;

  if (curr === "JPY") {
    return symbol + Math.round(converted).toLocaleString("ja-JP");
  }
  if (curr === "INR") {
    return symbol + Math.round(converted).toLocaleString("en-IN");
  }
  if (curr === "USD" || curr === "GBP" || curr === "EUR") {
    return symbol + Math.round(converted).toLocaleString("en-US");
  }
  return symbol + Math.round(converted).toLocaleString();
}

/** Legacy alias pointing to formatPrice so all existing component call sites automatically reflect the user's preferred currency */
export function inr(n: number, currency?: SupportedCurrency): string {
  return formatPrice(n, currency);
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
