#!/usr/bin/env node
// Spike: does free Yahoo Finance expose a corporate action BEFORE its ex-date,
// or only after? (task-2026-09-01-ca-hub-spike-yahoo-forward-retry)
//
// Probes the same two endpoints a Next.js route handler would call, from plain
// Node (global fetch, no deps):
//   (a) quoteSummary?modules=calendarEvents  -> exDividendDate / dividendDate
//   (b) chart?range=6mo&interval=1d&events=div,split -> dividend/split history
//
// If Yahoo 401/403s or demands a crumb, that is recorded verbatim — no working
// around it.

const TICKERS = ["AAPL", "KO", "JNJ", "FLJP", "FLCH"]; // + FT ETFs (fund spine)

// Same UA the app sends (src/lib/investors/yahoo-finance.ts) — probe the
// endpoints as production would see them.
const UA =
  "Mozilla/5.0 (compatible; KnowledgeHub/1.0; +https://corporate-action.vercel.app)";

const QUOTE_URL = (t) =>
  `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(t)}?modules=calendarEvents`;
const CHART_URL = (t) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?range=6mo&interval=1d&events=div%2Csplit`;

const RUN_DATE = new Date().toISOString().slice(0, 10);

function isoDay(tsSec) {
  // 0 / null / NaN are Yahoo sentinels for "no value" — not epoch dates.
  if (tsSec == null || !Number.isFinite(tsSec) || tsSec === 0) return null;
  return new Date(tsSec * 1000).toISOString().slice(0, 10);
}

function futureLabel(tsSec) {
  if (tsSec == null || !Number.isFinite(tsSec) || tsSec === 0) return "n/a";
  return tsSec * 1000 > Date.now() ? "FUTURE" : "PAST";
}

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
  } catch (err) {
    return { status: 0, ok: false, text: `network error: ${err.message}`, json: null };
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body — keep text */
  }
  return { status: res.status, ok: res.ok, text, json };
}

function calendarLine(label, tsSec) {
  const day = isoDay(tsSec);
  const when = futureLabel(tsSec);
  if (day === null) return `${label.padEnd(16)} none       ->  ${when}`;
  return `${label.padEnd(16)} ${day}  ->  ${when} (relative to ${RUN_DATE})`;
}

function latestEvent(events) {
  // Events object is keyed by unix-seconds; each entry also carries .date.
  const keys = Object.keys(events ?? {});
  if (keys.length === 0) return { count: 0, latest: null };
  const latest = keys.reduce((a, b) => (Number(a) > Number(b) ? a : b));
  const entry = events[latest];
  const dateSec = entry?.date ?? Number(latest);
  return { count: keys.length, latest: isoDay(dateSec) };
}

async function probeTicker(t) {
  console.log(`== ${t} ==`);
  const today = RUN_DATE;

  // (a) calendarEvents
  const q = await getJson(QUOTE_URL(t));
  console.log(`(a) quoteSummary calendarEvents -> HTTP ${q.status}`);
  if (!q.ok) {
    console.log(`    BODY: ${q.text.slice(0, 500)}`);
  } else {
    const cal = q.json?.quoteSummary?.result?.[0]?.calendarEvents;
    const exRaw = cal?.exDividendDate?.raw ?? cal?.exDividendDate;
    const divRaw = cal?.dividendDate?.raw ?? cal?.dividendDate;
    console.log(`    exDividendDate: ${isoDay(exRaw)} -> ${futureLabel(exRaw)} (relative to ${today})`);
    console.log(`    dividendDate:   ${isoDay(divRaw)} -> ${futureLabel(divRaw)} (relative to ${today})`);
    console.log(`    raw: ${JSON.stringify(cal)}`);
  }

  // (b) chart events
  const c = await getJson(CHART_URL(t));
  console.log(`(b) chart 6mo div,split          -> HTTP ${c.status}`);
  if (!c.ok) {
    console.log(`    BODY: ${c.text.slice(0, 500)}`);
  } else {
    const ev = c.json?.chart?.result?.[0]?.events;
    const divs = latestEvent(ev?.dividends);
    const splits = latestEvent(ev?.splits);
    console.log(`    dividends (6mo): ${divs.count} event(s), latest = ${divs.latest ?? "none"}`);
    console.log(`    splits (6mo):    ${splits.count} event(s), latest = ${splits.latest ?? "none"}`);
    if (ev?.dividends) console.log(`    raw dividends: ${JSON.stringify(ev.dividends)}`);
    if (ev?.splits) console.log(`    raw splits:    ${JSON.stringify(ev.splits)}`);
  }
  console.log("");
}

async function main() {
  console.log(`run date: ${RUN_DATE} (UTC)`);
  console.log("");
  for (const t of TICKERS) {
    await probeTicker(t);
    await new Promise((r) => setTimeout(r, 250)); // be polite
  }
  console.log("done");
}

main().catch((err) => {
  console.error("spike failed:", err);
  process.exit(1);
});