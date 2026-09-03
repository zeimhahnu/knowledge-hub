export const SYMBOL_QUERY_MAX_LENGTH = 40;

export type SymbolSuggestion = {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
};

type YahooQuote = {
  symbol?: unknown;
  shortname?: unknown;
  longname?: unknown;
  exchDisp?: unknown;
  exchange?: unknown;
  typeDisp?: unknown;
  quoteType?: unknown;
};

type YahooSearchResponse = { quotes?: unknown };

/** Returns a trimmed query or null when it cannot be sent to Yahoo. */
export function validateSymbolQuery(value: string): string | null {
  const query = value.trim();
  return query.length >= 1 && query.length <= SYMBOL_QUERY_MAX_LENGTH ? query : null;
}

/** Maps Yahoo's public search shape without filtering by listing region. */
export function mapYahooSuggestions(payload: YahooSearchResponse): SymbolSuggestion[] {
  if (!Array.isArray(payload.quotes)) return [];

  return payload.quotes.flatMap((quote): SymbolSuggestion[] => {
    if (!quote || typeof quote !== "object") return [];
    const row = quote as YahooQuote;
    if (typeof row.symbol !== "string" || !row.symbol.trim()) return [];

    const symbol = row.symbol.trim();
    const name = [row.shortname, row.longname, symbol].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )?.trim() ?? symbol;
    const exchange = [row.exchDisp, row.exchange].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )?.trim() ?? "Unknown exchange";
    const type = [row.typeDisp, row.quoteType].find(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    )?.trim() ?? "Unknown type";

    return [{ symbol, name, exchange, type }];
  });
}
