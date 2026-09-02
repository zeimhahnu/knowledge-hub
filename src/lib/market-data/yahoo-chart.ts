import type {
  YahooChartCalendar,
  YahooChartDividendRow,
  YahooChartQuote,
  YahooSymbolSearchResult,
  YahooChartSplitRow,
  YahooMarketDataResponse,
} from "./yahoo-chart-types";

const YAHUA =
  "Mozilla/5.0 (compatible; KnowledgeHub/1.0; +https://corporate-action.vercel.app)";

const UPSTREAM_REVALIDATE_SEC = 300;
const SEARCH_REVALIDATE_SEC = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T> {
  const opts = {
    headers: { "User-Agent": YAHUA, Accept: "application/json" },
    next: { revalidate },
  } as const;

  let res = await fetch(url, opts);
  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await sleep(400);
    res = await fetch(url, opts);
  }
  if (!res.ok) {
    throw new Error(`Upstream ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type ChartResult = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        longName?: string;
        shortName?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        instrumentType?: string;
        quoteType?: string;
        currency?: string;
        financialCurrency?: string;
        marketState?: string;
      };
      events?: {
        dividends?: Record<string, { amount?: number; date?: number }>;
        splits?: Record<
          string,
          { date?: number; numerator?: number; denominator?: number }
        >;
      };
    }>;
    error?: { description?: string };
  };
};

type QuoteSummaryResult = {
  quoteSummary?: {
    result?: Array<{
      summaryProfile?: {
        sector?: string;
        industry?: string;
        country?: string;
      };
      quoteType?: {
        longName?: string;
        shortName?: string;
        exchange?: string;
        quoteType?: string;
      };
      price?: {
        regularMarketPrice?: { raw?: number };
        regularMarketChange?: { raw?: number };
        regularMarketChangePercent?: { raw?: number };
        regularMarketPreviousClose?: { raw?: number };
        regularMarketDayLow?: { raw?: number };
        regularMarketDayHigh?: { raw?: number };
        regularMarketVolume?: { raw?: number };
        averageDailyVolume10Day?: { raw?: number };
        averageDailyVolume3Month?: { raw?: number };
        marketCap?: { raw?: number };
        currency?: string;
        exchangeName?: string;
        longName?: string;
        shortName?: string;
        marketState?: string;
      };
      summaryDetail?: {
        dividendRate?: { raw?: number };
        dividendYield?: { raw?: number };
        payoutRatio?: { raw?: number };
        fiveYearAvgDividendYield?: { raw?: number };
        exDividendDate?: { raw?: number };
        trailingPE?: { raw?: number };
        beta?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
        currency?: string;
        dayLow?: { raw?: number };
        dayHigh?: { raw?: number };
        averageVolume?: { raw?: number };
        regularMarketVolume?: { raw?: number };
        marketCap?: { raw?: number };
        previousClose?: { raw?: number };
      };
      defaultKeyStatistics?: {
        trailingEps?: { raw?: number };
        beta?: { raw?: number };
      };
      calendarEvents?: {
        exDividendDate?: { raw?: number };
        dividendDate?: { raw?: number };
        earnings?: {
          earningsDate?: Array<{ raw?: number }>;
        };
      };
    }>;
    error?: { description?: string };
  };
};

type SearchResultRaw = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    typeDisp?: string;
    exchDisp?: string;
    exchange?: string;
    sector?: string;
    industry?: string;
    sectorDisp?: string;
    industryDisp?: string;
    isYahooFinance?: boolean;
  }>;
};

function isoDay(tsSec?: number): string | undefined {
  if (tsSec == null || !Number.isFinite(tsSec)) return undefined;
  return new Date(tsSec * 1000).toISOString().slice(0, 10);
}

function ratioFromSplit(n?: number, d?: number): string {
  if (n == null || d == null || d === 0) return "—";
  return `${n}:${d}`;
}

/**
 * Normalize user input to a Yahoo symbol.
 *
 * - Uppercases & trims whitespace.
 * - Keeps suffixes like `.HK`, `.TO`, `.L`, `.T`, `.AX`, `.PA`, etc.
 * - Converts the US class-share convention (`BRK.B` → `BRK-B`) only when
 *   nothing after the dot looks like a market suffix (i.e. a single letter).
 */
export function normalizeTicker(raw: string): string {
  const base = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!base) return "";
  const dotIdx = base.lastIndexOf(".");
  if (dotIdx === -1) return base;
  const suffix = base.slice(dotIdx + 1);
  // Yahoo uses dot suffixes for London (.L) and Tokyo (.T); only other
  // single-letter suffixes are interpreted as US class shares.
  if (suffix.length === 1 && suffix !== "L" && suffix !== "T") {
    return `${base.slice(0, dotIdx)}-${suffix}`;
  }
  return base;
}

export type YahooChartRequest = {
  ticker: string;
  interval?: "1d";
  range?: "10y";
  events?: "div|split";
};

/** Builds the proven Yahoo v8/chart request without performing network I/O. */
export function makeYahooChartRequest({
  ticker,
  interval = "1d",
  range = "10y",
  events = "div|split",
}: YahooChartRequest): { ticker: string; url: string } {
  const symbol = normalizeTicker(ticker);
  if (!symbol || !/^[A-Z0-9.\-=^]+$/.test(symbol)) {
    throw new Error("INVALID_TICKER");
  }
  return {
    ticker: symbol,
    url: `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&events=${encodeURIComponent(events)}`,
  };
}

export async function searchYahooSymbols(
  query: string,
  limit = 8,
): Promise<YahooSymbolSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0&listsCount=0&enableFuzzyQuery=true&enableNavLinks=false&enableEnhancedTrivialQuery=false`;
  try {
    const json = await fetchJson<SearchResultRaw>(url, SEARCH_REVALIDATE_SEC);
    const out: YahooSymbolSearchResult[] = [];
    for (const q of json.quotes ?? []) {
      if (!q.symbol) continue;
      if (q.isYahooFinance === false) continue;
      out.push({
        symbol: q.symbol,
        name: q.longname ?? q.shortname,
        exchange: q.exchDisp ?? q.exchange,
        quoteType: q.typeDisp ?? q.quoteType,
        sector: q.sectorDisp ?? q.sector,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchYahooMarketData(
  ticker: string,
): Promise<YahooMarketDataResponse> {
  const warnings: string[] = [];
  const { ticker: sym, url: chartUrl } = makeYahooChartRequest({ ticker });
  const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=summaryProfile,quoteType,price,summaryDetail,calendarEvents,defaultKeyStatistics`;

  const [chartJson, summaryJson] = await Promise.all([
    fetchJson<ChartResult>(chartUrl, UPSTREAM_REVALIDATE_SEC),
    fetchJson<QuoteSummaryResult>(summaryUrl, UPSTREAM_REVALIDATE_SEC).catch(
      () => null,
    ),
  ]);

  const err = chartJson.chart?.error?.description;
  if (err) {
    throw new Error("NOT_FOUND");
  }

  const result = chartJson.chart?.result?.[0];
  if (!result?.meta) {
    throw new Error("NOT_FOUND");
  }

  const meta = result.meta;
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose;
  let changeAbs: number | undefined;
  let changePct: number | undefined;
  if (
    price != null &&
    prev != null &&
    prev !== 0 &&
    Number.isFinite(price) &&
    Number.isFinite(prev)
  ) {
    changeAbs = price - prev;
    changePct = (changeAbs / prev) * 100;
  }

  const quote: YahooChartQuote = {
    name: meta.longName ?? meta.shortName,
    price,
    changePct,
    changeAbs,
    exchange: meta.fullExchangeName ?? meta.exchangeName,
    currency: meta.currency,
    quoteType: meta.quoteType ?? meta.instrumentType,
    marketState: meta.marketState,
    previousClose: prev,
  };

  const divMap = result.events?.dividends ?? {};
  const dividends: YahooChartDividendRow[] = Object.entries(divMap)
    .map(([ts, v]) => ({
      date: isoDay(Number(ts)) ?? isoDay(v.date),
      amount: v.amount ?? 0,
    }))
    .filter((r) => r.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))
    .slice(0, 8)
    .map((r) => ({ date: r.date!, amount: r.amount }));

  const splitMap = result.events?.splits ?? {};
  const splits: YahooChartSplitRow[] = Object.entries(splitMap)
    .map(([ts, v]) => ({
      date: isoDay(Number(ts)) ?? isoDay(v.date),
      ratio: ratioFromSplit(v.numerator, v.denominator),
    }))
    .filter((r) => r.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))
    .slice(0, 8)
    .map((r) => ({ date: r.date!, ratio: r.ratio }));

  let calendar: YahooChartCalendar | undefined;
  let metrics: YahooMarketDataResponse["metrics"];

  const qr = summaryJson?.quoteSummary?.result?.[0];
  if (qr) {
    const prof = qr.summaryProfile;
    if (prof?.sector) quote.sector = prof.sector;
    if (prof?.industry) quote.industry = prof.industry;
    if (prof?.country) quote.country = prof.country;

    const qt = qr.quoteType;
    if (qt?.quoteType) quote.quoteType = qt.quoteType;
    if (!quote.name) quote.name = qt?.longName ?? qt?.shortName;

    const p = qr.price;
    if (p?.regularMarketPrice?.raw != null) {
      quote.price = p.regularMarketPrice.raw;
    }
    if (p?.regularMarketChange?.raw != null) {
      quote.changeAbs = p.regularMarketChange.raw;
    }
    if (p?.regularMarketChangePercent?.raw != null) {
      quote.changePct = p.regularMarketChangePercent.raw;
    }
    if (p?.regularMarketPreviousClose?.raw != null) {
      quote.previousClose = p.regularMarketPreviousClose.raw;
    }
    if (p?.regularMarketDayLow?.raw != null) quote.dayLow = p.regularMarketDayLow.raw;
    if (p?.regularMarketDayHigh?.raw != null) quote.dayHigh = p.regularMarketDayHigh.raw;
    if (p?.regularMarketVolume?.raw != null) quote.volume = p.regularMarketVolume.raw;
    const avgV =
      p?.averageDailyVolume3Month?.raw ?? p?.averageDailyVolume10Day?.raw;
    if (avgV != null) quote.avgVolume = avgV;
    if (p?.marketCap?.raw != null) quote.marketCap = p.marketCap.raw;
    if (p?.currency) quote.currency = p.currency;
    if (p?.marketState) quote.marketState = p.marketState;
    if (p?.exchangeName && !quote.exchange) quote.exchange = p.exchangeName;
    if (p?.longName && !quote.name) quote.name = p.longName;

    const sd = qr.summaryDetail;
    if (sd) {
      if (sd.fiftyTwoWeekLow?.raw != null) quote.yearLow = sd.fiftyTwoWeekLow.raw;
      if (sd.fiftyTwoWeekHigh?.raw != null) quote.yearHigh = sd.fiftyTwoWeekHigh.raw;
      if (sd.trailingPE?.raw != null) quote.peTrailing = sd.trailingPE.raw;
      if (sd.beta?.raw != null) quote.beta = sd.beta.raw;
      if (quote.dayLow == null && sd.dayLow?.raw != null) quote.dayLow = sd.dayLow.raw;
      if (quote.dayHigh == null && sd.dayHigh?.raw != null) quote.dayHigh = sd.dayHigh.raw;
      if (quote.volume == null && sd.regularMarketVolume?.raw != null) {
        quote.volume = sd.regularMarketVolume.raw;
      }
      if (quote.avgVolume == null && sd.averageVolume?.raw != null) {
        quote.avgVolume = sd.averageVolume.raw;
      }
      if (quote.marketCap == null && sd.marketCap?.raw != null) {
        quote.marketCap = sd.marketCap.raw;
      }
      if (quote.previousClose == null && sd.previousClose?.raw != null) {
        quote.previousClose = sd.previousClose.raw;
      }
    }

    const dks = qr.defaultKeyStatistics;
    if (dks?.trailingEps?.raw != null) quote.epsTrailing = dks.trailingEps.raw;
    if (quote.beta == null && dks?.beta?.raw != null) quote.beta = dks.beta.raw;

    const exRaw =
      qr.calendarEvents?.exDividendDate?.raw ??
      qr.summaryDetail?.exDividendDate?.raw;
    const earnArr = qr.calendarEvents?.earnings?.earningsDate ?? [];
    const earnStart = earnArr[0]?.raw;
    const earnEnd = earnArr[1]?.raw;

    calendar = {
      exDividendDate: exRaw != null ? isoDay(exRaw) : undefined,
      earningsDate: earnStart != null ? isoDay(earnStart) : undefined,
      earningsDateEnd:
        earnEnd != null && earnEnd !== earnStart ? isoDay(earnEnd) : undefined,
    };

    metrics = {};
    const dr = qr.summaryDetail?.dividendRate?.raw;
    const dy = qr.summaryDetail?.dividendYield?.raw;
    const pr = qr.summaryDetail?.payoutRatio?.raw;
    const fy = qr.summaryDetail?.fiveYearAvgDividendYield?.raw;
    if (dr != null) metrics.dividendRate = dr;
    if (dy != null) metrics.dividendYield = dy * 100;
    if (pr != null) metrics.payoutRatio = pr * 100;
    if (fy != null) metrics.fiveYearAvgDividendYield = fy;
    if (
      metrics.dividendRate == null &&
      metrics.dividendYield == null &&
      metrics.payoutRatio == null &&
      metrics.fiveYearAvgDividendYield == null
    ) {
      metrics = undefined;
    }
  } else {
    warnings.push(
      "Quote summary unavailable — calendar and fundamentals may be missing.",
    );
  }

  const qt = (quote.quoteType ?? "").toUpperCase();
  if (dividends.length === 0 && (qt === "EQUITY" || qt === "ETF" || qt === "")) {
    warnings.push("No dividend history in the last 10 years.");
  }

  return {
    ticker: meta.symbol ?? sym,
    fetchedAt: new Date().toISOString(),
    quote,
    dividends,
    splits,
    calendar,
    metrics,
    warnings,
  };
}
