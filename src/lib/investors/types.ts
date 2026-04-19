/** DTO returned by `GET /api/investors/quote` (Yahoo Finance–derived, delayed). */

export type InvestorDividendRow = { date: string; amount: number };

export type InvestorSplitRow = { date: string; ratio: string };

export type InvestorQuote = {
  name?: string;
  price?: number;
  changePct?: number;
  sector?: string;
  exchange?: string;
};

export type InvestorCalendar = {
  exDividendDate?: string;
  earningsDate?: string;
};

export type InvestorTickerResponse = {
  ticker: string;
  fetchedAt: string;
  quote?: InvestorQuote;
  dividends: InvestorDividendRow[];
  splits: InvestorSplitRow[];
  calendar?: InvestorCalendar;
  /** `dividendYield` is a percentage for display (e.g. 2.5 means 2.5%), from Yahoo raw × 100. */
  metrics?: { dividendRate?: number; dividendYield?: number };
  warnings: string[];
};
