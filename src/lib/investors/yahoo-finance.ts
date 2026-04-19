import type {
  InvestorCalendar,
  InvestorDividendRow,
  InvestorQuote,
  InvestorSplitRow,
  InvestorTickerResponse,
} from "./types";

const YAHUA =
  "Mozilla/5.0 (compatible; KnowledgeHub/1.0; +https://corporate-action.vercel.app)";

const UPSTREAM_REVALIDATE_SEC = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const opts = {
    headers: { "User-Agent": YAHUA, Accept: "application/json" },
    next: { revalidate: UPSTREAM_REVALIDATE_SEC },
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
        quoteType?: string;
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
      summaryProfile?: { sector?: string };
      price?: {
        regularMarketPrice?: { raw?: number };
        regularMarketChangePercent?: { raw?: number };
      };
      summaryDetail?: {
        dividendRate?: { raw?: number };
        dividendYield?: { raw?: number };
        exDividendDate?: { raw?: number };
      };
      calendarEvents?: {
        exDividendDate?: { raw?: number };
        earnings?: {
          earningsDate?: Array<{ raw?: number }>;
        };
      };
    }>;
    error?: { description?: string };
  };
};

function isoDay(tsSec?: number): string | undefined {
  if (tsSec == null || !Number.isFinite(tsSec)) return undefined;
  return new Date(tsSec * 1000).toISOString().slice(0, 10);
}

function ratioFromSplit(n?: number, d?: number): string {
  if (n == null || d == null || d === 0) return "—";
  return `${n}:${d}`;
}

/** Normalize user input to Yahoo symbol (e.g. brk.b → BRK-B). */
export function normalizeTicker(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/\./g, "-");
}

export async function buildInvestorPayload(
  ticker: string,
): Promise<InvestorTickerResponse> {
  const warnings: string[] = [];
  const sym = normalizeTicker(ticker);
  if (!sym || !/^[A-Z0-9.\-]+$/.test(sym)) {
    throw new Error("INVALID_TICKER");
  }

  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=10y&events=div%7Csplit`;
  const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=summaryProfile,price,summaryDetail,calendarEvents`;

  const [chartJson, summaryJson] = await Promise.all([
    fetchJson<ChartResult>(chartUrl),
    fetchJson<QuoteSummaryResult>(summaryUrl).catch(() => null),
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
  let changePct: number | undefined;
  if (
    price != null &&
    prev != null &&
    prev !== 0 &&
    Number.isFinite(price) &&
    Number.isFinite(prev)
  ) {
    changePct = ((price - prev) / prev) * 100;
  }

  const quote: InvestorQuote = {
    name: meta.longName ?? meta.shortName,
    price,
    changePct,
    exchange: meta.exchangeName,
  };

  const divMap = result.events?.dividends ?? {};
  const dividends: InvestorDividendRow[] = Object.entries(divMap)
    .map(([ts, v]) => ({
      date: isoDay(Number(ts)) ?? isoDay(v.date),
      amount: v.amount ?? 0,
    }))
    .filter((r) => r.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))
    .slice(0, 5)
    .map((r) => ({ date: r.date!, amount: r.amount }));

  const splitMap = result.events?.splits ?? {};
  const splits: InvestorSplitRow[] = Object.entries(splitMap)
    .map(([ts, v]) => ({
      date: isoDay(Number(ts)) ?? isoDay(v.date),
      ratio: ratioFromSplit(v.numerator, v.denominator),
    }))
    .filter((r) => r.date)
    .sort((a, b) => b.date!.localeCompare(a.date!))
    .slice(0, 8)
    .map((r) => ({ date: r.date!, ratio: r.ratio }));

  if (dividends.length === 0) {
    warnings.push("No dividend history in chart range (or none paid).");
  }

  let calendar: InvestorCalendar | undefined;
  let metrics: InvestorTickerResponse["metrics"];
  let sector: string | undefined;

  const qr = summaryJson?.quoteSummary?.result?.[0];
  if (qr) {
    sector = qr.summaryProfile?.sector;
    const p = qr.price;
    if (p?.regularMarketPrice?.raw != null) {
      quote.price = p.regularMarketPrice.raw;
    }
    if (p?.regularMarketChangePercent?.raw != null) {
      quote.changePct = p.regularMarketChangePercent.raw;
    }
    const exRaw =
      qr.calendarEvents?.exDividendDate?.raw ??
      qr.summaryDetail?.exDividendDate?.raw;
    const earnRaw = qr.calendarEvents?.earnings?.earningsDate?.[0]?.raw;

    calendar = {
      exDividendDate: exRaw != null ? isoDay(exRaw) : undefined,
      earningsDate: earnRaw != null ? isoDay(earnRaw) : undefined,
    };

    const dr = qr.summaryDetail?.dividendRate?.raw;
    const dy = qr.summaryDetail?.dividendYield?.raw;
    metrics = {};
    if (dr != null) metrics.dividendRate = dr;
    if (dy != null) metrics.dividendYield = dy * 100;
  } else {
    warnings.push("Quote summary unavailable; calendar and some metrics may be missing.");
  }

  if (sector) quote.sector = sector;

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
