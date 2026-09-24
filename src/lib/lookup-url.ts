/** The lookup URL is the lookup's state: home and the lookup's own event editor both build it here. */

export const TICKER_RE = /^[A-Za-z0-9.\-^=]{1,15}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Returns a lookup route for an already-known corporate action. */
export function buildLookupUrl(ticker: string, eventType: string, exDate: string, company?: string | null): string | null {
  const normalizedTicker = ticker.trim().toUpperCase();
  const normalizedEventType = eventType.trim();
  const normalizedExDate = exDate.trim();

  if (!TICKER_RE.test(normalizedTicker) || !normalizedEventType || !isValidDate(normalizedExDate)) {
    return null;
  }

  const companyQuery = company?.trim() ? `&company=${encodeURIComponent(company.trim())}` : "";
  return `/lookup/${encodeURIComponent(normalizedTicker)}?eventType=${encodeURIComponent(normalizedEventType)}&exDate=${encodeURIComponent(normalizedExDate)}${companyQuery}`;
}
