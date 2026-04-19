const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "US$",
  HKD: "HK$",
  CNY: "CN¥",
  JPY: "¥",
  GBP: "£",
  GBp: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
  INR: "₹",
  KRW: "₩",
  SGD: "S$",
  TWD: "NT$",
  CHF: "CHF",
  SEK: "SEK",
  NOK: "NOK",
  DKK: "DKK",
};

function resolveCurrency(code?: string): string {
  if (!code) return "USD";
  return code.toUpperCase() === "GBP" ? "GBP" : code.toUpperCase();
}

function resolveLocale(code?: string): string {
  switch (resolveCurrency(code)) {
    case "EUR":
      return "en-IE";
    case "GBP":
      return "en-GB";
    case "JPY":
      return "ja-JP";
    case "HKD":
      return "zh-HK";
    case "CNY":
      return "zh-CN";
    case "INR":
      return "en-IN";
    case "KRW":
      return "ko-KR";
    case "AUD":
      return "en-AU";
    case "CAD":
      return "en-CA";
    default:
      return "en-US";
  }
}

/** Currency-aware formatter. GBp (London pence) is converted to GBP. */
export function formatCurrency(n: number, currency?: string): string {
  const code = resolveCurrency(currency);
  let value = n;
  if (currency === "GBp" || currency === "GBX") value = n / 100;

  try {
    return new Intl.NumberFormat(resolveLocale(code), {
      style: "currency",
      currency: code,
      maximumFractionDigits: Math.abs(value) >= 100 ? 2 : 4,
    }).format(value);
  } catch {
    const sym = CURRENCY_SYMBOLS[code] ?? "";
    const formatted = value.toLocaleString("en-US", {
      maximumFractionDigits: 4,
    });
    return `${sym}${formatted}`;
  }
}

/** Alias kept for components that still import `formatUsd`. */
export function formatUsd(n: number, currency?: string): string {
  return formatCurrency(n, currency);
}

export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** Formats a large integer like market cap: 1.23T, 45.6B, 789M. */
export function formatCompact(n?: number, currency?: string): string | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  const code = resolveCurrency(currency);
  try {
    return new Intl.NumberFormat(resolveLocale(code), {
      style: "currency",
      currency: code,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    const sym = CURRENCY_SYMBOLS[code] ?? "";
    return `${sym}${n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })}`;
  }
}

export function formatInteger(n?: number): string | undefined {
  if (n == null || !Number.isFinite(n)) return undefined;
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

/** Days from today to ISO date string (UTC midnight); undefined if invalid/past. */
export function daysUntil(iso?: string): number | undefined {
  if (!iso) return undefined;
  const target = new Date(`${iso}T12:00:00Z`).getTime();
  if (!Number.isFinite(target)) return undefined;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const diff = Math.ceil((target - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : undefined;
}

export function dividendTrend(divs: { amount: number }[]): "up" | "down" | "flat" | "—" {
  if (divs.length < 2) return "—";
  const a = divs[0]!.amount;
  const b = divs[divs.length - 1]!.amount;
  if (a > b * 1.0001) return "up";
  if (a < b * 0.9999) return "down";
  return "flat";
}
