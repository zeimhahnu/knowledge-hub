/** Delayed Yahoo Finance chart data for corporate-action lookup infrastructure. */

export type YahooChartDividendRow = { date: string; amount: number };

export type YahooChartSplitRow = { date: string; ratio: string };

export type YahooChartQuote = {
  name?: string;
  price?: number;
  changePct?: number;
  changeAbs?: number;
  sector?: string;
  industry?: string;
  exchange?: string;
  /** ISO currency code (e.g. "USD", "HKD", "EUR") used for price formatting. */
  currency?: string;
  marketState?: string;
  /** Previous regular close. */
  previousClose?: number;
  /** Today/last session day range. */
  dayLow?: number;
  dayHigh?: number;
  /** 52-week range. */
  yearLow?: number;
  yearHigh?: number;
  /** Volumes in shares. */
  volume?: number;
  avgVolume?: number;
  /** Market cap in listing currency. */
  marketCap?: number;
  /** Trailing PE ratio, beta, EPS as reported by the data source. */
  peTrailing?: number;
  beta?: number;
  epsTrailing?: number;
  /** Country + quote type help global users (EQUITY, ETF, INDEX…). */
  country?: string;
  quoteType?: string;
};

export type YahooChartCalendar = {
  exDividendDate?: string;
  earningsDate?: string;
  /** Estimated earnings window end, if provided. */
  earningsDateEnd?: string;
};

/** Shared row shape used by the search typeahead. */
export type YahooSymbolSearchResult = {
  symbol: string;
  name?: string;
  exchange?: string;
  quoteType?: string;
  sector?: string;
  country?: string;
};

export type YahooMarketDataResponse = {
  ticker: string;
  fetchedAt: string;
  quote?: YahooChartQuote;
  dividends: YahooChartDividendRow[];
  splits: YahooChartSplitRow[];
  calendar?: YahooChartCalendar;
  /** `dividendYield` is a percentage for display (e.g. 2.5 means 2.5%), from Yahoo raw × 100. */
  metrics?: {
    dividendRate?: number;
    dividendYield?: number;
    payoutRatio?: number;
    fiveYearAvgDividendYield?: number;
  };
  warnings: string[];
};
