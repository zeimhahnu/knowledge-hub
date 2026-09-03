/**
 * News cross-validation — §8 of
 * `SPECS/corporate-action-hub-revamp-design-2026-09-01.md`.
 *
 * The core job of the tool: the USER supplies a known event (ticker + event
 * type + ex-date) and we validate it against what the web says right now.
 * This module never discovers events and never invents one.
 *
 * Two layers, kept deliberately separate:
 *
 * 1. `scoreNewsValidation` — PURE decision logic. No I/O, no `Date.now()`,
 *    no network. Injected search results in, verdict out. Exported alone so
 *    `scripts/check-news-validation.mjs` can exercise it with fake result
 *    sets (Node ≥22 type stripping, no deps, no network).
 *
 * 2. `validateNews` — the live path. Builds the query, calls the Tavily
 *    search API, feeds the normalized results to the pure scorer.
 *
 * ANTI-HALLUCINATION CONTRACT (D3 of the slice):
 * - `sources` is built ONLY from URLs the search backend actually returned.
 *   Every entry must appear verbatim in the injected result set.
 * - Empty `sources` ⇒ verdict `unverified`, never `confirmed`.
 * - If the backend is unconfigured (no `TAVILY_API_KEY`) or unreachable,
 *   the live path returns `validationRan: false` + a warning, and the route
 *   surfaces 503. A confirmation the code never fetched is impossible by
 *   construction.
 *
 * This file imports nothing: it stays importable by plain Node (type
 * stripping) and framework-free.
 */

export type NewsVerdict = "confirmed" | "contradicted" | "unverified";
export type NewsConfidence = "high" | "medium" | "low";

export type NewsSource = {
  url: string;
  title: string;
  /** Publication date as YYYY-MM-DD (UTC day), from the backend's own date. */
  publishedAt: string;
  snippet: string;
};

/** A raw search result, shape-normalized from whatever the backend returned. */
export type SearchResultItem = {
  url: string;
  title?: string;
  /** Raw publication-date string from the backend; may be empty/unparseable. */
  publishedDate?: string | null;
  /** Snippet/body text the backend returned. */
  content?: string;
};

export type ScoreResult = {
  verdict: NewsVerdict;
  confidence: NewsConfidence;
  sources: NewsSource[];
  reasoning: string;
};

export type ScoreInput = {
  exDate: Date;
  eventType: string;
  results: SearchResultItem[];
  /** Issuer identity from the user's event; omitted only for legacy pure checks. */
  ticker?: string;
  companyName?: string;
  /** Announcements normally precede the ex-date; 90d covers special dividends / M&A. */
  windowBeforeDays?: number;
  /** A dated source published shortly AFTER the ex-date can still contradict it. */
  windowAfterDays?: number;
};

export type NewsValidationInput = {
  ticker: string;
  companyName?: string;
  eventType: string;
  /** YYYY-MM-DD */
  exDate: string;
};

export type NewsValidationResult = ScoreResult & {
  /** False = the live search could not run at all (no key / backend down). */
  validationRan: boolean;
  warning?: string;
};

const DEFAULT_WINDOW_BEFORE_DAYS = 90;
const DEFAULT_WINDOW_AFTER_DAYS = 14;
const MS_PER_DAY = 86_400_000;
const MAX_SNIPPET_CHARS = 300;
const CORPORATE_SUFFIXES = new Set([
  "inc", "corp", "corporation", "plc", "ltd", "limited", "nv", "sa", "ag",
  "holdings", "group", "company", "co",
]);
const NON_ISSUER_TITLE_WORDS = new Set([
  "announces", "announced", "declares", "declared", "dividend", "dividends",
  "earnings", "ex-dividend", "payment", "quarterly", "special", "stock",
]);
// "Apple CDR (CAD Hedged)" is a wrapper for a different instrument, not Apple Inc.
const DERIVATIVE_WRAPPER_RE = /\b(?:cdr|adr|gdr|etn|cfd|warrant|hedged)\b/i;
// "11 S&P 500 Dividend Stocks..." is a multi-issuer roundup even if AAPL appears.
const COUNTABLE_LIST_RE = /^\s*\d+\b[^.]*\b(?:stocks|companies)\b/i;
// Several ticker tokens likewise indicate a roundup rather than issuer-specific evidence.
const TICKER_TOKEN_RE = /\b[A-Z]{1,5}\b/g;

type EvidenceStrength = "strong" | "weak";

/** Whole UTC days since the Unix epoch, floored to the date's UTC day. */
const utcDay = (d: Date): number => Math.floor(d.getTime() / MS_PER_DAY);

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function distinctiveCompanyWords(companyName: string | undefined): string[] {
  return (companyName ?? "")
    .match(/[A-Za-z0-9]+/g)
    ?.filter((word) => !CORPORATE_SUFFIXES.has(word.toLowerCase())) ?? [];
}

/**
 * Keep a result only when it identifies the issuer: a standalone ticker wins;
 * otherwise every suffix-stripped company-name word must appear together and
 * cannot be immediately extended by another distinctive title-case word.
 * This rejects "Apple Hospitality" for Apple Inc while allowing "Apple Inc.".
 */
export function issuerMatches(
  result: Pick<SearchResultItem, "title" | "content" | "url">,
  ticker: string,
  companyName?: string,
): boolean {
  const text = `${result.title ?? ""} ${result.content ?? ""}`;
  const normalizedTicker = ticker.trim();
  if (normalizedTicker) {
    const tickerPattern = new RegExp(`\\b${escapeRegExp(normalizedTicker)}\\b`, "i");
    if (tickerPattern.test(text)) return true;
  }

  const words = distinctiveCompanyWords(companyName);
  if (words.length === 0) return false;
  const namePattern = words.map(escapeRegExp).join("\\s+");
  const nameMatch = new RegExp(`\\b(${namePattern})\\b`, "i").exec(text);
  if (!nameMatch) return false;

  const tail = text.slice((nameMatch.index ?? 0) + nameMatch[0].length);
  const nextWord = /^\s+([A-Za-z][A-Za-z-]*)/.exec(tail)?.[1];
  return !nextWord ||
    CORPORATE_SUFFIXES.has(nextWord.toLowerCase()) ||
    NON_ISSUER_TITLE_WORDS.has(nextWord.toLowerCase()) ||
    nextWord === nextWord.toLowerCase();
}

/**
 * Strong evidence needs issuer identity in the title, not just a snippet hit.
 * Listicles such as "11 S&P 500 Dividend Stocks Going Ex-Dividend" can mention
 * AAPL, while "Apple CDR (CAD Hedged)" is a different instrument. Both real
 * 2026-09-03 false positives remain visible as weak sources but cannot decide.
 */
function evidenceStrength(
  result: Pick<SearchResultItem, "title" | "content">,
  ticker: string | undefined,
  companyName: string | undefined,
): EvidenceStrength {
  if (!ticker) return "strong"; // Legacy pure checks have no issuer identity to classify.
  const title = result.title ?? "";
  const titleIssuerMatch = ticker
    ? issuerMatches({ title, url: "" }, ticker, companyName)
    : false;
  const tickerTokens = new Set(`${title} ${result.content ?? ""}`.match(TICKER_TOKEN_RE) ?? []);
  const isRoundup = tickerTokens.size > 1 || COUNTABLE_LIST_RE.test(title);
  const isWrapper = DERIVATIVE_WRAPPER_RE.test(title);
  return titleIssuerMatch && !isRoundup && !isWrapper ? "strong" : "weak";
}

/**
 * Event → search terms, keyed by the canonical ids from
 * `src/lib/event-taxonomy.ts`. Unknown event types fall back to their own
 * normalized name — the tool is open, not closed to the 13 documented types.
 * Unresolvable → generic "corporate action".
 */
const EVENT_TERMS: Record<string, readonly string[]> = {
  "cash-dividend": ["dividend", "ex-dividend", "ex dividend"],
  "special-dividend": [
    "special dividend",
    "special cash dividend",
    "one-time dividend",
    "extra dividend",
  ],
  "stock-dividend": ["stock dividend", "share dividend"],
  "bonus-issue": ["bonus issue", "bonus share", "scrip issue"],
  "stock-split": ["stock split", "share split", "split"],
  "spin-off": ["spin-off", "spinoff", "demerger"],
  "rights-issue": ["rights issue", "rights offering"],
  "secondary-offering": ["secondary offering", "follow-on offering"],
  "private-placement": ["private placement"],
  "return-of-capital": ["return of capital", "capital return"],
  merger: ["merger", "acquisition"],
  "tender-offer": ["tender offer"],
  bankruptcy: ["bankruptcy", "delisting", "liquidation"],
};

export function eventSearchTerms(eventType: string): readonly string[] {
  const normalized = eventType
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!normalized) return ["corporate action"];

  const direct = EVENT_TERMS[normalized];
  if (direct) return direct;

  // Fuzzy: "dividend" → cash-dividend terms, "reverse split" → stock-split terms.
  for (const terms of Object.values(EVENT_TERMS)) {
    if (terms.some((t) => normalized.includes(t.replace(/[^a-z0-9]+/g, "")))) {
      return terms;
    }
  }
  return [normalized.replace(/-/g, " "), "corporate action"];
}

/**
 * Explicit cancellation / delay language. Evaluated ONLY on results that
 * already matched the event terms, so the context is the event itself.
 */
const CONTRADICTION_SIGNALS: readonly string[] = [
  "cancel",
  "cancell",
  "delay",
  "postpon",
  "withdraw",
  "suspend",
  "scrap",
  "axed",
  "abandon",
  "will not pay",
  "won't pay",
  "will not be paying",
  "no dividend",
  "no longer pay",
  "not expected to pay",
  "fails to pay",
];

/**
 * A dated source published AFTER the ex-date that still presents the event as
 * upcoming ("will pay", "scheduled for") contradicts the claimed schedule:
 * announcements precede ex-dates.
 */
const PROSPECTIVE_SIGNALS: readonly string[] = [
  " will ",
  "to go ex",
  "upcom",
  "scheduled",
  "set for",
  "is set to",
  "expected to",
  "plans to",
  "says it will",
  "announced that it will",
];

const EX_CONTEXT_RE = /ex-?date|ex-?dividend|\bgo ex\b|record date|effective date/i;

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** Common written-date forms: ISO, "Sep 1, 2026", "1 September 2026". */
function extractDates(text: string): Date[] {
  const out: Date[] = [];
  const iso = /\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g;
  const monthFirst = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/gi;
  const dayFirst = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d{2})\b/gi;

  for (const m of text.matchAll(iso)) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) out.push(d);
  }
  const pushMonth = (month: string, day: number, year: number) => {
    const mon = MONTHS[month.slice(0, 3).toLowerCase()];
    if (!mon) return;
    const d = new Date(year, mon - 1, day);
    if (!Number.isNaN(d.getTime())) out.push(d);
  };
  for (const m of text.matchAll(monthFirst)) pushMonth(m[1], Number(m[2]), Number(m[3]));
  for (const m of text.matchAll(dayFirst)) pushMonth(m[2], Number(m[1]), Number(m[3]));
  return out;
}

function isContradiction(
  text: string,
  publishedDay: number,
  exDay: number,
  beforeDays: number,
): boolean {
  // (a) explicit cancellation / delay language about the event.
  if (CONTRADICTION_SIGNALS.some((s) => text.includes(s))) return true;

  // (b) a materially different ex-date / record date stated in the text.
  if (EX_CONTEXT_RE.test(text)) {
    for (const d of extractDates(text)) {
      const diff = Math.abs(utcDay(d) - exDay);
      if (diff > 3 && diff <= beforeDays) return true;
    }
  }

  // (c) published after the ex-date yet still announcing the event as upcoming.
  if (publishedDay - exDay > 3 && PROSPECTIVE_SIGNALS.some((s) => text.includes(s))) {
    return true;
  }
  return false;
}

function normalizeDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * PURE scorer — §8 steps 3–4. Takes injected search results and the
 * user-supplied ex-date; returns the dated, cited verdict.
 *
 * Pipeline per result: must match the issuer, have a REAL parsable publication
 * date inside [exDate - before, exDate + after], and match event terms; then
 * it is classified agreeing or contradicting (rules above).
 *
 * Confidence per §8: high = 2+ independent (distinct-domain) dated sources
 * agree; medium = 1 independent; otherwise unverified/low. A contradiction
 * outranks stale confirmation — a cancel/delay signal beats an old article.
 */
export function scoreNewsValidation(input: ScoreInput): ScoreResult {
  const exDay = utcDay(input.exDate);
  const before = input.windowBeforeDays ?? DEFAULT_WINDOW_BEFORE_DAYS;
  const after = input.windowAfterDays ?? DEFAULT_WINDOW_AFTER_DAYS;
  const terms = eventSearchTerms(input.eventType);
  const termsLower = terms.map((t) => t.toLowerCase());
  const windowStart = new Date(input.exDate.getTime() - before * MS_PER_DAY);
  const windowEnd = new Date(input.exDate.getTime() + after * MS_PER_DAY);

  const seen = new Set<string>(); // first occurrence of a URL wins
  const datedMatches: Array<{
    source: NewsSource;
    contradicting: boolean;
    strength: EvidenceStrength;
  }> = [];
  let issuerMatchesCount = 0;
  let issuerMismatches = 0;

  for (const r of input.results) {
    if (typeof r !== "object" || r === null) continue;
    if (typeof r.url !== "string" || !r.url) continue;
    if (seen.has(r.url)) continue;
    seen.add(r.url);

    if (input.ticker && !issuerMatches(r, input.ticker, input.companyName)) {
      issuerMismatches += 1;
      continue; // wrong issuer → never participates in either verdict count
    }
    issuerMatchesCount += 1;

    const pub = parseDate(r.publishedDate);
    if (!pub || pub.getTime() < windowStart.getTime() || pub.getTime() > windowEnd.getTime()) {
      continue; // not dated, or dated outside the window → not evidence
    }

    const text = `${r.title ?? ""} ${r.content ?? ""}`.toLowerCase();
    if (!termsLower.some((t) => text.includes(t))) continue; // not about this event

    const strength = evidenceStrength(r, input.ticker, input.companyName);
    const source: NewsSource = {
      url: r.url,
      title: strength === "weak" ? `[Weak evidence] ${r.title ?? ""}` : r.title ?? "",
      publishedAt: pub.toISOString().slice(0, 10),
      snippet: (r.content ?? "").slice(0, MAX_SNIPPET_CHARS),
    };
    datedMatches.push({
      source,
      contradicting: isContradiction(text, utcDay(pub), exDay, before),
      strength,
    });
  }

  const strongMatches = datedMatches.filter((m) => m.strength === "strong");
  const weakMatches = datedMatches.length - strongMatches.length;
  const agreeing = strongMatches.filter((m) => !m.contradicting);
  const contradicting = strongMatches.filter((m) => m.contradicting);
  const domains = new Set(agreeing.map((m) => normalizeDomain(m.source.url)));

  let verdict: NewsVerdict;
  let confidence: NewsConfidence;
  if (contradicting.length > 0) {
    verdict = "contradicted";
    confidence = "medium";
  } else if (agreeing.length >= 2) {
    verdict = "confirmed";
    confidence = domains.size >= 2 ? "high" : "medium";
  } else if (agreeing.length === 1) {
    verdict = "confirmed";
    confidence = "medium";
  } else {
    verdict = "unverified";
    confidence = "low";
  }

  const reasoning = buildReasoning(
    verdict,
    confidence,
    terms,
    windowStart,
    windowEnd,
    input.results.length,
    issuerMatchesCount,
    issuerMismatches,
    datedMatches.length,
    strongMatches.length,
    weakMatches,
    agreeing.length,
    contradicting.length,
    [...domains],
  );

  return {
    verdict,
    confidence,
    sources: datedMatches.map((m) => m.source),
    reasoning,
  };
}

function buildReasoning(
  verdict: NewsVerdict,
  confidence: NewsConfidence,
  terms: readonly string[],
  windowStart: Date,
  windowEnd: Date,
  resultCount: number,
  issuerMatchesCount: number,
  issuerMismatches: number,
  total: number,
  strong: number,
  weak: number,
  agreeing: number,
  contradicting: number,
  domains: string[],
): string {
  const window = `${windowStart.toISOString().slice(0, 10)}..${windowEnd.toISOString().slice(0, 10)}`;
  const base = [
    `Search window ${window}; ${resultCount} result(s),`,
    `${issuerMatchesCount} matched issuer (${issuerMismatches} dropped for issuer mismatch);`,
    `${total} dated result(s) matched event terms (${terms.join(", ")}):`,
    `${strong} strong, ${weak} weak; ${agreeing} agreeing, ${contradicting} contradicting.`,
  ].join(" ");
  switch (verdict) {
    case "confirmed":
      return `${base} Verdict confirmed (${confidence}): ${domains.length} independent dated source(s) — ${domains.join(", ")} or fewer — corroborate the event.`;
    case "contradicted":
      return `${base} Verdict contradicted: dated source(s) cancel/delay the event, state a conflicting ex-date, or announce it as upcoming after the claimed ex-date.`;
    default:
      if (strong === 0 && weak > 0) {
        return `${base} Verdict unverified: search found dated result(s), but none was strong enough to confirm or contradict this issuer's event.`;
      }
      return `${base} Verdict unverified: no dated source inside the window corroborates or contradicts the event as claimed.`;
  }
}

/* ------------------------------------------------------------------ */
/* Live path (server-side only).                                       */
/* ------------------------------------------------------------------ */

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const REQUEST_TIMEOUT_MS = 15_000;
const TAVILY_MAX_RESULTS = 8;

function buildQuery(input: NewsValidationInput, terms: readonly string[]): string {
  const parts: string[] = [input.ticker.trim().toUpperCase()];
  if (input.companyName && input.companyName.trim().length > 0) {
    parts.push(input.companyName.trim());
  }
  parts.push(...terms.slice(0, 2));
  const q = parts.join(" ");
  return q.length > 400 ? q.slice(0, 400) : q;
}

function normalizeTavilyResults(json: unknown): SearchResultItem[] {
  if (typeof json !== "object" || json === null) return [];
  const { results } = json as { results?: unknown };
  if (!Array.isArray(results)) return [];
  const out: SearchResultItem[] = [];
  for (const item of results) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const url = typeof r.url === "string" ? r.url : "";
    if (!url) continue;
    out.push({
      url,
      title: typeof r.title === "string" ? r.title : undefined,
      publishedDate: typeof r.published_date === "string" ? r.published_date : null,
      content: typeof r.content === "string" ? r.content : undefined,
    });
  }
  return out;
}

/**
 * Live validation: search the web for an announcement matching the
 * user-supplied event and score it. Honest-degradation contract:
 * unconfigured/unreachable backend → `validationRan: false` + warning, and
 * the verdict is `unverified` — never a confirmation it did not fetch.
 */
export async function validateNews(
  input: NewsValidationInput,
): Promise<NewsValidationResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.length === 0) {
    return {
      verdict: "unverified",
      confidence: "low",
      sources: [],
      reasoning:
        "Validation could not run: no TAVILY_API_KEY configured. No search was performed, so nothing is confirmed or denied.",
      validationRan: false,
      warning:
        "News search is not configured (TAVILY_API_KEY missing) — validation could not run.",
    };
  }

  const exDate = parseDate(input.exDate);
  if (!exDate) {
    return {
      verdict: "unverified",
      confidence: "low",
      sources: [],
      reasoning: `Validation could not run: unparseable ex-date "${input.exDate}".`,
      validationRan: false,
      warning: `Invalid ex-date "${input.exDate}" — expected YYYY-MM-DD.`,
    };
  }

  const terms = eventSearchTerms(input.eventType);
  const query = buildQuery(input, terms);

  let json: unknown;
  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        topic: "news",
        max_results: TAVILY_MAX_RESULTS,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`tavily http ${res.status}`);
    json = await res.json();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return {
      verdict: "unverified",
      confidence: "low",
      sources: [],
      reasoning: `Validation could not run: search backend request failed (${detail}).`,
      validationRan: false,
      warning: "News search backend unreachable — validation could not run.",
    };
  }

  const results = normalizeTavilyResults(json);
  const scored = scoreNewsValidation({
    exDate,
    eventType: input.eventType,
    results,
    ticker: input.ticker,
    companyName: input.companyName,
  });
  return { ...scored, validationRan: true };
}
