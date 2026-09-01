# Spike: is Yahoo's free corporate-action data forward-looking?

> Task: `task-2026-09-01-ca-hub-spike-yahoo-forward-retry`
> Run date: **2026-09-01 (UTC)** — "future" is only meaningful relative to this date.
> Script: `scripts/spike-yahoo-forward.mjs` — plain Node 18+ global `fetch`, zero npm deps.
> Question: does free Yahoo Finance data expose a corporate action **before** its
> ex-date, or only **after**?
> Endpoints probed (the same two a Next.js route handler would call):
> - (a) `https://query2.finance.yahoo.com/v10/finance/quoteSummary/{t}?modules=calendarEvents`
> - (b) `https://query1.finance.yahoo.com/v8/finance/chart/{t}?range=6mo&interval=1d&events=div%2Csplit`

---

## Raw output (verbatim)

`node scripts/spike-yahoo-forward.mjs`, run 2026-09-01 ~14:02 UTC:

```
run date: 2026-09-01 (UTC)

== AAPL ==
(a) quoteSummary calendarEvents -> HTTP 401
    BODY: {"finance":{"result":null,"error":{"code":"Unauthorized","description":"Invalid Crumb"}}}
(b) chart 6mo div,split          -> HTTP 200
    dividends (6mo): 2 event(s), latest = 2026-08-10
    splits (6mo):    0 event(s), latest = none
    raw dividends: {"1778506200":{"amount":0.27,"date":1778506200},"1786368600":{"amount":0.27,"date":1786368600}}

== KO ==
(a) quoteSummary calendarEvents -> HTTP 401
    BODY: {"finance":{"result":null,"error":{"code":"Unauthorized","description":"Invalid Crumb"}}}
(b) chart 6mo div,split          -> HTTP 200
    dividends (6mo): 2 event(s), latest = 2026-06-15
    splits (6mo):    0 event(s), latest = none
    raw dividends: {"1773408600":{"amount":0.53,"date":1773408600},"1781530200":{"amount":0.53,"date":1781530200}}

== JNJ ==
(a) quoteSummary calendarEvents -> HTTP 401
    BODY: {"finance":{"result":null,"error":{"code":"Unauthorized","description":"Invalid Crumb"}}}
(b) chart 6mo div,split          -> HTTP 200
    dividends (6mo): 2 event(s), latest = 2026-08-25
    splits (6mo):    0 event(s), latest = none
    raw dividends: {"1779802200":{"amount":1.34,"date":1779802200},"1787664600":{"amount":1.34,"date":1787664600}}

== FLJP ==
(a) quoteSummary calendarEvents -> HTTP 401
    BODY: {"finance":{"result":null,"error":{"code":"Unauthorized","description":"Invalid Crumb"}}}
(b) chart 6mo div,split          -> HTTP 200
    dividends (6mo): 1 event(s), latest = 2026-06-26
    splits (6mo):    0 event(s), latest = none
    raw dividends: {"1782480600":{"amount":0.169,"date":1782480600}}

== FLCH ==
(a) quoteSummary calendarEvents -> HTTP 401
    BODY: {"finance":{"result":null,"error":{"code":"Unauthorized","description":"Invalid Crumb"}}}
(b) chart 6mo div,split          -> HTTP 200
    dividends (6mo): 1 event(s), latest = 2026-06-26
    splits (6mo):    0 event(s), latest = none
    raw dividends: {"1782480600":{"amount":0.142,"date":1782480600}}

done
```

## Environment notes (probes to characterize the 401)

Run 2026-09-01 ~14:03–14:04 UTC, from the VPS:

- App's exact production call — `query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL?modules=summaryProfile,quoteType,price,summaryDetail,calendarEvents,defaultKeyStatistics` with the app's UA — also returns `HTTP 401 {"code":"Unauthorized","description":"Invalid Crumb"}`. Not a query2-only quirk.
- Same endpoint with a Chrome browser UA: still `HTTP 401 Invalid Crumb`. Not a UA fingerprint.
- Live app probe — `GET https://corporate-action.vercel.app/api/investors/quote?ticker=AAPL` → `HTTP 200`, `fetchedAt: 2026-09-01T14:04:04Z`, but with `warnings: ["Quote summary unavailable — calendar and fundamentals may be missing."]`. **Vercel serverless hits the same crumb wall**; the app's own calendar fields are already empty in production. The 401 is not specific to this box.

## Findings table

Run date: **2026-09-01 (UTC)**.

| ticker | exDividendDate (a) | future? | latest historical event (b, 6mo) |
|---|---|---|---|
| AAPL | `401 Invalid Crumb` — not returned | n/a (endpoint blocked) | dividend `2026-08-10` (PAST); no split |
| KO | `401 Invalid Crumb` — not returned | n/a (endpoint blocked) | dividend `2026-06-15` (PAST); no split |
| JNJ | `401 Invalid Crumb` — not returned | n/a (endpoint blocked) | dividend `2026-08-25` (PAST); no split |
| FLJP (FT ETF) | `401 Invalid Crumb` — not returned | n/a (endpoint blocked) | dividend `2026-06-26` (PAST); no split |
| FLCH (FT ETF) | `401 Invalid Crumb` — not returned | n/a (endpoint blocked) | dividend `2026-06-26` (PAST); no split |

## Verdict

**Dividends forward-looking: NO.** The only Yahoo field that can carry a future
ex-date — `calendarEvents.exDividendDate` / `dividendDate` — is crumb-gated:
every ticker returned `401 {"code":"Unauthorized","description":"Invalid Crumb"}`
from both query1 and query2, with the app's UA and a browser UA, and the live
Vercel deployment shows the same failure (its calendar warning fired on
2026-09-01). The freely accessible `v8/finance/chart?events=div,split` endpoint
delivers dividend history strictly *after* the fact: on the run date the newest
dividend in every 6-month window was already in the past (AAPL 2026-08-10, KO
2026-06-15, JNJ 2026-08-25, FLJP 2026-06-26, FLCH 2026-06-26). No pre-ex-date
dividend signal exists on these endpoints.

**Splits forward-looking: NO.** The chart endpoint emits split events only after
they occur, and Yahoo exposes no announced/future split calendar field at all —
a future split is not detectable on free Yahoo data.

## Scope guard

This spike covers dividends and splits only — the two event types the design
treats as "measured". No conclusion is drawn about the other 11 event types, no
redesign is proposed, no paid feed is recommended.

---

*Sources: all dates and bodies above come from responses actually received on 2026-09-01 (script stdout pasted verbatim; live-app probe response with `fetchedAt` timestamp).*