export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(n);
}

export function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
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
