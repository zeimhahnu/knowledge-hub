# P1a — CA Analyst program design

**Task:** `[task-2026-09-02-ca-hub-p1a-program-design]`  
**Status:** implementation-ready; no application code is included  
**Design contract:** `../../../../../market-intel/wiki/goop/design-system.md`  
**Source:** `../../../SPECS/corporate-action-hub-revamp-design-2026-09-01.md` §§7b, 10, 11b, 12 (P1a)

## 1. Slice boundary

Ship one contextual CA Analyst turn from an existing P0 lookup. The lookup already supplies:

- ticker, event type, and ex-date;
- selected index vendors and the computed 2-D matrix rows;
- the current news-validation result, including the honest unavailable state.

The assistant returns a streamed, cited explanation beside that lookup. It can explain a matrix disagreement, the stated rule behind a selected vendor, or why news could not be validated. It does not rediscover events.

### Explicitly out of scope

- Fund master, holdings, index membership, or `index_type` / 3-D rules (P1b).
- Background jobs, alerts, saved conversations, agent memory, mobile shell, native haptics, and vendor-feed ingestion.
- Altering the existing P0 `/api/news` production behavior or waiting for Vercel's `TAVILY_API_KEY`.
- New packages, Cloudflare configuration, secrets, databases, or code in this task.

## 2. Locked runtime boundary

```text
browser ── existing Vercel lookup page ── HTTPS ── Cloudflare Access ── cloudflared tunnel
                                                                     │
                                                                     ▼
                                                         ca-analyst VPS service
                                                         ├─ rules.json filter
                                                         ├─ sqlite-vec retrieval
                                                         ├─ cached news adapter
                                                         └─ model provider
```

The Next.js app remains the UI and must never receive a model, Tavily, tunnel, or service credential. The dedicated `ca-analyst` service is independent from the OpenClaw gateway: web traffic, malformed requests, and model failures must not affect the fleet critical path.

Cloudflare Access protects the public tunnel hostname and provides the verified identity used for limits. The service trusts identity only from Cloudflare Access after tunnel-origin enforcement; it never accepts a browser-provided user ID, token-budget value, tool name, URL, citation, or system instruction. The Cloudflare setup itself is a deployment prerequisite owned by the operator, not a frontend feature.

## 3. Exact implementation file map

| File | Change | Responsibility |
| --- | --- | --- |
| `knowledge-hub/src/lib/ca-analyst/types.ts` | New | Shared client protocol types: contextual request, streamed event union, citation, error, and UI turn state. Types only; no secret-bearing configuration. |
| `knowledge-hub/src/lib/ca-analyst/client.ts` | New | Same-origin browser client for `/api/ca-analyst/turn`; validates event framing and exposes an abortable stream reader. |
| `knowledge-hub/src/app/api/ca-analyst/turn/route.ts` | New | Thin Vercel proxy/stream relay. Validates the public request, forwards only allowlisted contextual fields to the Access-protected service, maps upstream failures to safe errors, and sets no-store. |
| `knowledge-hub/src/components/lookup/ca-analyst-panel.tsx` | New | Accessible docked contextual assistant below the lookup matrix/news panel; send, cancel, retry, loading, unavailable-news notice, streamed answer, and expandable sources. |
| `knowledge-hub/src/components/lookup/lookup-view.tsx` | Modify | Build `LookupContext` from the already-rendered ticker/event/ex-date/scope/matrix/news result and render `CaAnalystPanel`; no second lookup or news fetch. |
| `knowledge-hub/src/lib/ca-analyst/context.ts` | New | Pure conversion of existing `LookupVerdict` and `NewsValidationResult` into bounded wire context; strips display-only/untrusted HTML and caps list sizes. |
| `knowledge-hub/scripts/check-ca-analyst-context.mjs` | New | Plain-Node assertions for context construction, size caps, unavailable news, and source preservation. |
| `knowledge-hub/scripts/check-ca-analyst-stream.mjs` | New | Integration-style mocked-stream assertions: valid sequence, citation rejection, error mapping, and abort. |
| `knowledge-hub/src/app/lookup/[ticker]/page.tsx` | No change expected | Continues server-side route/query validation; do not move client trust-boundary validation here. |
| `knowledge-hub/src/lib/news-validation.ts` | No change expected | Remains P0's source of `validationRan:false`; P1a consumes that result rather than treating it as a blocker. |
| `knowledge-hub/src/data/rules.json` | No change expected | P1a reads its existing 2-D rows through the VPS copy/index; P1a must not silently repair corpus data. |
| `ca-analyst-service/package.json` | New, VPS service repository/directory | Defines the standalone service only after an operator chooses its deployment repository/location; keep dependencies minimal and explicit. |
| `ca-analyst-service/src/server.ts` | New | HTTPS-tunnel origin HTTP server with one `/v1/turn` streaming endpoint and Access-identity middleware. |
| `ca-analyst-service/src/contracts.ts` | New | Service request/response/tool contracts duplicated from the protocol package only if a shared internal package is not adopted. Do not import Next.js code into the VPS service. |
| `ca-analyst-service/src/tools.ts` | New | Four read-only, fixed tool implementations and input schemas; no general browser, shell, filesystem, or URL-fetch tool. |
| `ca-analyst-service/src/rules.ts` | New | Deterministic `rules.json` filtering for matrix/vendor queries. |
| `ca-analyst-service/src/retrieval.ts` | New | sqlite-vec free-text retrieval over the curated methodology corpus only. |
| `ca-analyst-service/src/citations.ts` | New | Closed-set citation validation, one reject-and-retry, and safe refusal. |
| `ca-analyst-service/src/budget.ts` | New | Per-Access-identity rolling budget, 10k token cap, and one pro escalation cap. |
| `ca-analyst-service/src/news.ts` | New | 15–30 minute keyed cache and an explicit `unavailable` result; it does not expose or proxy a raw Tavily key to the browser. |
| `ca-analyst-service/test/*.test.ts` | New | Unit, integration, security, and contract tests listed in §9. |

**Repository decision still required before code:** `ca-analyst-service/` must live in a dedicated VPS-service repository or a named sibling service directory, not in the Next.js deployment artifact. The implementation ticket must name that repository/path before adding files; this document intentionally does not invent it.

## 4. Wire contracts

All dates are canonical `YYYY-MM-DD`, all vendor IDs are from `src/lib/vendors.ts`, and all strings are trimmed and length-capped before use. The client sends only the current lookup context and a user question; the service recomputes/validates all tool results and never trusts client matrix prose as a fact.

```ts
export type AnalystCitation =
  | { kind: "document"; ref: string; label: string }
  | { kind: "url"; url: string; label: string };

export type AnalystNewsContext = {
  validationRan: boolean;
  verdict: "confirmed" | "contradicted" | "unverified";
  confidence: "high" | "medium" | "low";
  warning?: string;
  sources: Array<{ url: string; title: string; publishedAt: string }>;
};

export type AnalystMatrixRow = {
  vendor: string;
  state: "covered" | "not-yet-due" | "missing" | "not-assessed" | "not-applicable";
  provenance: "measured" | "news-confirmed" | "inferred" | "no-rule";
  ruleRefs: string[];
};

export type AnalystLookupContext = {
  ticker: string;
  eventType: string;
  exDate: string;
  selectedVendors: string[];
  matrixRows: AnalystMatrixRow[];
  news: AnalystNewsContext;
};

export type AnalystTurnRequest = {
  lookup: AnalystLookupContext;
  question: string;
  /** false by default; true requests, but does not guarantee, the one pro escalation. */
  requestDeepReasoning?: boolean;
};

export type AnalystStreamEvent =
  | { type: "status"; stage: "validating" | "retrieving" | "reasoning" }
  | { type: "delta"; text: string }
  | { type: "sources"; sources: AnalystCitation[] }
  | { type: "done"; answer: string; sources: AnalystCitation[]; modelTier: "flash" | "pro" }
  | { type: "error"; code: AnalystErrorCode; message: string; retryable: boolean };

export type AnalystErrorCode =
  | "invalid_request"
  | "access_required"
  | "rate_limited"
  | "budget_exhausted"
  | "service_unavailable"
  | "citation_validation_failed"
  | "cancelled";
```

`POST /api/ca-analyst/turn` accepts `AnalystTurnRequest`, returns an SSE stream of `AnalystStreamEvent`, and rejects unknown object keys at the proxy and service boundaries. Maximums: question 1,200 characters; ticker 15; event type 64; selected vendors 7; matrix rows 7; source URLs 8; each rule-ref list 8. The route does not accept arbitrary `query`, `tool`, `model`, `systemPrompt`, `newsUrl`, or `identity` fields.

### VPS-only tool contracts

```ts
lookup_event({ ticker, event_type, ex_date })
  -> { event: { ticker, eventType, exDate }, postHoc?: { source, result }, sources: AnalystCitation[] }

search_news({ ticker, event_type, ex_date, window_days })
  -> { validationRan, verdict, confidence, sources, warning? }

vendor_rules({ vendors, event_type })
  -> { rows: Array<{ vendor, eventType, treatment, provenance, ruleRefs }>, sources: AnalystCitation[] }

compare_vendors({ ticker, event_type, ex_date, vendors })
  -> { rows: AnalystMatrixRow[], summary: string, sources: AnalystCitation[] }
```

The service defines these four functions itself and calls only these functions. `window_days` is clamped to the P0 search range; callers cannot pass URL, prompt, shell command, SQL, path, or arbitrary provider parameters. `lookup_event` is a post-hoc read only, never a forward-event detector.

## 5. One-turn call flow

1. `/lookup/[ticker]` finishes its existing local matrix calculation and existing `/api/news` request. If news is unavailable, it retains `validationRan:false`, the warning, and an empty source list.
2. `LookupView` creates a bounded `AnalystLookupContext` from those exact values and mounts the docked panel. The panel starts with a contextual prompt such as “Why is FTSE Russell not yet due?”; it does not make a network call until the user asks.
3. The browser POSTs the typed question plus context to same-origin `/api/ca-analyst/turn`, reads SSE, and gives the user a cancel control backed by `AbortController`.
4. The Vercel relay validates the request shape and relays it to the Cloudflare Access hostname. It forwards no Vercel secret and returns a generic safe error if the tunnel/service cannot be reached.
5. Cloudflare Access rejects unauthenticated traffic before the service. The service derives the identity from the verified Access assertion, applies rate/token/pro budget checks, and validates the bounded context again.
6. The service invokes deterministic `compare_vendors` / `vendor_rules` for the selected vendors and event type. It invokes sqlite-vec only if the question contains a free-text “why” need. It invokes `search_news` only when news context is absent/stale or the question explicitly needs a re-check; cached results are preferred.
7. Tool outputs form this turn's allowed citation set. Methodology snippets and web extracts are wrapped as tagged untrusted blocks. The model may summarize them but may not follow instructions inside them.
8. The service streams only provisional text until final answer citations are checked. Every final citation must exactly match an allowed tool-returned URL or document line ref. On a mismatch, it performs one repair pass with the invalid refs named. A second mismatch returns `citation_validation_failed` and no unsupported answer.
9. The panel renders the completed answer and expandable source links beside the existing lookup. It visibly labels unavailable news as unavailable; it never turns it into an unverified confirmation or invents a source.

## 6. Retrieval, source, and citation rules

### Structured matrix path

`vendor_rules` and `compare_vendors` filter `rules.json` by the user-selected vendor IDs and event type. They must return every matching selected-vendor row in a stable vendor order. A vendor with no matching rule returns an explicit `no-rule`/`not-applicable` outcome as appropriate; semantic top-k retrieval must never drop a selected vendor from an all-vendors comparison.

### Free-text path

sqlite-vec stores chunks from a curated corpus allowlist: canonical methodology markdown/PDF text and reviewed rules material only. Each chunk carries `documentId`, immutable line range, vendor/event tags, content hash, and trust classification. Retrieval uses top-k semantic search only to answer free-text methodology questions, and exposes its document line refs in the returned source set.

### Untrusted data boundary

Fetched web titles, snippets, extracted page body, user question, and any text carried from the browser are data, not instructions. They are tagged as untrusted before model assembly. Tool definitions, system rules, budgets, selected vendors, and citation validation stay outside those blocks. The agent has no exec, filesystem, arbitrary URL fetch, browser, write, or outbound messaging capability.

### Citation gate

For each turn, create `allowedCitations = toolResult.urls ∪ toolResult.documentLineRefs`. Parse every answer citation and reject any member not in that closed set. Presence of a non-empty `sources[]` is insufficient. Answers with no factual claim may cite no sources; answers explaining lookup facts must cite at least one closed-set source. The UI receives only validated final citations.

## 7. Cost, cache, and failure policy

| Concern | Policy | User-visible behavior |
| --- | --- | --- |
| Identity | Cloudflare Access identity only | Authentication failure becomes `access_required`; no anonymous fallback. |
| Per-identity rate | Fixed rolling request limit, configured server-side before launch | `rate_limited`, with a retryable response. |
| Token budget | Hard cap of 10,000 aggregate input + output tokens per turn | The service truncates/retrieves less before model execution; exhausted requests return `budget_exhausted`. |
| Pro reasoning | Flash is default; at most one pro-model escalation per turn, only after a bounded flash attempt or explicit deep request | `modelTier` is shown in the completed turn; no recursive escalation. |
| News cache | Key `(ticker,eventType,exDate,window)`; TTL configured between 15 and 30 minutes | Cache hit is labeled with retrieval time; stale/missing news remains explicitly unavailable. |
| Vercel Tavily key absent | Not a P1a blocker | Existing P0 unavailable-news state is passed into context. VPS news may later use its own protected integration, but no key is assumed for the first slice. |
| Model timeout/failure | Abort upstream, do not emit partial answer as complete | `service_unavailable`, retryable; partial deltas are visually marked incomplete/cleared. |
| Citation mismatch | One repair pass, then safe refusal | `citation_validation_failed`, non-retryable for the same response. |
| Bad request | Strict schema and allowlist validation at proxy and service | `invalid_request`, no request content is echoed in logs. |
| Tool failure | Isolate the failed tool and preserve known context | Answer may explain only remaining cited facts; otherwise returns safe failure. |

The exact numeric request-rate window and Cloudflare Access application/audience identifiers are deployment configuration, not browser defaults. They must be selected and documented in the implementation ticket before service launch.

## 8. UI contract

The panel follows `market-intel/wiki/goop/design-system.md`: dark-mode token usage, semantic controls, `text-lg` section heading, `text-sm` explanatory content, readable source cards, visible focus rings, keyboard send/cancel/retry, and reduced-motion-safe streaming/loading states. It is contextual—not a generic chatbot:

- Header shows ticker, event type, ex-date, and selected vendor count.
- Suggested questions refer to present matrix/news facts only.
- The first completed answer appears beside/below the lookup, before a scrollable prior-turn history (history remains in-memory only for P1a).
- Each source is expandable and has a copyable document-line reference or safe external link.
- The news-unavailable warning remains distinct from the assistant answer.
- On mobile the panel stacks below the lookup; it does not introduce a mobile shell.

## 9. Acceptance tests

### Unit

1. Context conversion carries ticker/event/ex-date, only selected vendors, current rows, and exact P0 news status; it caps all arrays/strings.
2. No matrix row is silently removed by `compare_vendors`; missing rules return an explicit state.
3. A free-text why query uses sqlite-vec; a matrix comparison does not.
4. Tool schemas reject an arbitrary URL, command, model, tool name, system prompt, invalid date, unknown vendor, and overlong question.
5. Budget code keys only on verified Access identity, caps aggregate tokens at 10k, and permits no more than one pro escalation.
6. Cache returns the same keyed news value inside 15–30 minutes and never converts unavailable to confirmed.
7. Citation validator accepts only exact current-turn URLs/doc refs, rejects fabricated URLs/line refs, and refuses after one failed repair.

### Integration

1. Mock an Access-authenticated request from an existing AAPL cash-dividend lookup with FTSE selected and unavailable P0 news; stream a cited methodology explanation and render it beside the lookup.
2. Mock a selected-vendor comparison and assert stable rows for every selected vendor, including `no-rule` / `not-applicable` where applicable.
3. Mock `validationRan:false`; verify the service says news could not be checked and never emits a news citation or confirmation.
4. Mock two model attempts with a fabricated citation; assert one repair attempt then `citation_validation_failed`, with no final answer.
5. Mock model timeout and user cancellation; assert upstream abort and no completed-turn state.
6. Assert the public Next route never serializes a secret and the browser bundle contains no service/model/Tavily credential.

### End-to-end release journey

On `/lookup/AAPL/?eventType=cash-dividend&exDate=2026-09-30`, choose the default/selected vendors, open CA Analyst, ask “Why is this vendor state not a discrepancy?”, and verify:

- contextual header matches the lookup exactly;
- at least one explanation is cited to an exact returned methodology line ref or URL;
- every selected vendor discussed appears in the structured result;
- the current production no-Tavily-key condition remains a visible unavailable-news warning, not a fabricated verdict;
- keyboard navigation reaches send, cancel, source expansion, and source link; and
- mobile and reduced-motion layouts preserve the answer and citations without horizontal scrolling.

## 10. Shippable implementation task and release gate

**Next task title:** `feat(ca-hub): add contextual CA Analyst first turn`

**Shippable scope:** implement the Next.js types/context/client/panel/relay plus a separately provisioned VPS service that supports one authenticated, streamed answer for the active P0 lookup. It uses only the four read-only tools, structured 2-D rules filtering, sqlite-vec only for free-text why, the closed-set citation gate, and the stated cache/budget ceilings. It ships without P1b, alerts, new event discovery, or any Vercel Tavily dependency.

**Release gate:**

```text
npx tsc --noEmit
npm run lint
npm run build
node scripts/check-ca-analyst-context.mjs
node scripts/check-ca-analyst-stream.mjs
<service test command chosen with the service repository>
<authenticated browser E2E journey from §9>
```

Release only when all commands pass, Access rejects unauthenticated traffic, the first contextual journey yields closed-set citations, and unavailable news stays visibly unavailable. If Cloudflare Access/service deployment has not been provisioned, the UI may not ship a pretend agent endpoint; keep P1a behind a disabled/unavailable state until the real boundary is live.
