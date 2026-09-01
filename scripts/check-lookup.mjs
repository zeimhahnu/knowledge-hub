#!/usr/bin/env node
/**
 * Self-check for the /lookup verdict logic — `src/lib/lookup-verdict.ts`.
 *
 * Plain node, no deps, no network, no React rendering (Node ≥22.18 strips
 * types natively, so this imports the REAL module and can never drift from
 * the source). A fake Storage is injected where settings matter; nothing
 * touches window.localStorage.
 *
 * Assertions (D4 contract):
 *   1. not-applicable rows are excluded from ALL totals — uninvolved, never
 *      counted as covered/missing/anything (§7a-ii).
 *   2. not-assessed rows (no lead time set) are excluded from covered/missing
 *      counts and reported separately — never graded as a timing state.
 *   3. an all-not-applicable (or otherwise ungradable) scope produces an
 *      honest EMPTY verdict — the summary asserts "nothing to grade", never
 *      a zero-filled "0 missing".
 *   4. Sanity on the primitives the page leans on: CAEV lookup, days-out
 *      arithmetic, scope persistence, and the state engine's boundary
 *      semantics via the real coverage.ts.
 *
 * Run from repo root: node scripts/check-lookup.mjs
 */
import assert from "node:assert/strict";
import {
  caevForEventType,
  computeLookupVerdict,
  daysOut,
  getScopeVendors,
  leadTimeProvenance,
  setScopeVendors,
  vendorAppliesToEvent,
  verdictSummary,
} from "../src/lib/lookup-verdict.ts";
import { setEventOverride, setVendorDefault } from "../src/lib/coverage-settings.ts";

let n = 0;
const ok = (name) => {
  n++;
  console.log(`  ✓ ${name}`);
};

/** In-memory Storage stand-in: same surface as the browser object. */
const makeFakeStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    _map: map,
  };
};

const TODAY = new Date("2026-09-01T12:00:00Z"); // fixed — no Date.now() anywhere
const d = (offsetDays) => new Date(Date.UTC(2026, 8, 1 + offsetDays)); // 2026-09-01 + n
const ex = (offsetDays) => d(offsetDays);

// ─── Primitives ─────────────────────────────────────────────────────────────
assert.equal(caevForEventType("cash-dividend"), "DVOP");
assert.equal(caevForEventType("stock-split"), "SPLT");
assert.equal(caevForEventType("no-such-event"), null);
ok("CAEV codes read from the real rules.json (DVOP / SPLT / null)")

assert.equal(daysOut(ex(2), TODAY), 2);
assert.equal(daysOut(ex(0), TODAY), 0);
assert.equal(daysOut(ex(-1), TODAY), -1);
ok("daysOut arithmetic: +2 / 0 / -1 whole UTC days")

assert.equal(vendorAppliesToEvent("msci", "cash-dividend"), true);
assert.equal(vendorAppliesToEvent("ftse", "cash-dividend"), true);
assert.equal(vendorAppliesToEvent("vettafi", "rights-issue"), false);
assert.equal(vendorAppliesToEvent("vettafi", "cash-dividend"), true);
ok("event applicability: rules.json rows + documented no-coverage (VettaFi rights-issue)")

// ─── Scope persistence ──────────────────────────────────────────────────────
const scopeStore = makeFakeStorage();
assert.equal(getScopeVendors(scopeStore).length, 7, "virgin scope defaults to every vendor");
setScopeVendors(["msci", "ftse"], scopeStore);
assert.deepEqual(getScopeVendors(scopeStore), ["msci", "ftse"]);
setScopeVendors(["solactive", "bogus", "msci", "msci"], scopeStore);
assert.deepEqual(getScopeVendors(scopeStore), ["solactive", "msci"], "unknown ids dropped, dupes deduped");
scopeStore.setItem("ca-hub.vendor-scope.v1", "{corrupt json");
assert.equal(getScopeVendors(scopeStore).length, 7, "corrupt scope store falls back to the default");
ok("vendor scope: default = all, persisted subset, unknown ids dropped, corrupt store safe")

// ─── Rule 1: not-applicable excluded from ALL totals ────────────────────────
// VettaFi does not cover rights issues. Scope msci + ftse + vettafi; ex-date
// 2 days out. FTSE's stated 5-day lead says "missing"; MSCI is unset
// (not-assessed); VettaFi must not appear anywhere but notApplicable.
const mixed = computeLookupVerdict({
  ticker: "ABC",
  eventType: "rights-issue",
  exDate: ex(2),
  today: TODAY,
  scope: ["msci", "ftse", "vettafi"],
});
assert.deepEqual(mixed.totals, {
  applicable: 2,
  assessed: 1,
  covered: 0,
  missing: 1,
  notYetDue: 0,
  notAssessed: 1,
  notApplicable: 1,
});
assert.equal(mixed.rows.find((r) => r.vendor === "vettafi")?.state, "not-applicable");
assert.equal(mixed.rows.find((r) => r.vendor === "ftse")?.state, "missing");
assert.equal(mixed.rows.find((r) => r.vendor === "msci")?.state, "not-assessed");
ok("mixed scope: VettaFi (rights-issue) counted in notApplicable ONLY — never in a timing total")

// ─── Rule 2: not-assessed reported separately, never graded ────────────────
const unaGraded = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(2),
  today: TODAY,
  scope: ["msci"], // MSCI lead time is unset on a virgin store
});
assert.equal(unaGraded.totals.applicable, 1);
assert.equal(unaGraded.totals.notAssessed, 1);
assert.equal(unaGraded.totals.missing, 0);
assert.equal(unaGraded.totals.covered, 0);
assert.equal(unaGraded.totals.assessed, 0);
assert.equal(unaGraded.empty, true, "nothing graded → honest empty, never '0 missing'");
assert.ok(verdictSummary(unaGraded.totals, unaGraded.empty).includes("No verdicts yet"));
assert.ok(!verdictSummary(unaGraded.totals, unaGraded.empty).includes("0 missing"));
ok("not-assessed: excluded from covered/missing, reported separately, empty verdict")

// ─── Rule 3: all-not-applicable scope → honest empty verdict ───────────────
const allNa = computeLookupVerdict({
  ticker: "ABC",
  eventType: "rights-issue",
  exDate: ex(2),
  today: TODAY,
  scope: ["vettafi"],
});
assert.equal(allNa.totals.applicable, 0);
assert.equal(allNa.totals.notApplicable, 1);
assert.equal(allNa.totals.missing, 0);
assert.equal(allNa.empty, true);
const naSummary = verdictSummary(allNa.totals, allNa.empty);
assert.ok(naSummary.includes("Nothing to grade"));
assert.ok(!naSummary.includes("0"), "an all-not-applicable scope never renders a zero total");
ok("all-not-applicable scope: empty verdict says 'Nothing to grade', not '0 missing'")

// Empty scope entirely — same honest empty.
const none = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(2),
  today: TODAY,
  scope: [],
});
assert.equal(none.totals.applicable, 0);
assert.equal(none.empty, true);
assert.ok(verdictSummary(none.totals, none.empty).includes("Nothing to grade"));
ok("empty scope: 'Nothing to grade' — no vendors in scope at all")

// ─── Timing semantics through the REAL coverage engine ─────────────────────
// FTSE's stated 5-day lead: 10 days out = not-yet-due; 2 days out = missing.
const due = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(10),
  today: TODAY,
  scope: ["ftse"],
});
assert.deepEqual(
  due.rows.map((r) => [r.vendor, r.state]),
  [["ftse", "not-yet-due"]],
);
assert.equal(due.totals.notYetDue, 1);
assert.equal(due.totals.missing, 0);
assert.equal(due.totals.assessed, 1);
assert.equal(due.empty, false);
ok("FTSE stated 5-day lead, ex-date 10 days out → not-yet-due (timing, not a gap)")

// A user-typed default flips provenance AND the verdict: 1-day lead flips
// the same 2-days-out event from missing (stated 5) to not-yet-due (2 > 1).
const store = makeFakeStorage();
setVendorDefault("ftse", 1, store);
const userSet = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(2),
  today: TODAY,
  scope: ["ftse"],
  storage: store,
});
assert.equal(userSet.rows[0]?.state, "not-yet-due", "1-day lead, ex-date 2 days out = not-yet-due");
assert.deepEqual(leadTimeProvenance(userSet.rows[0]?.source ?? "unset", "ftse"), {
  label: "your setting",
  tone: "user",
});
ok("user-set lead time: verdict re-graded AND provenance reads 'your setting' (D3)")

// Boundary that matters most: lead 1, ex-date 1 day out → daysOut === leadDays
// is still MISSING (the off-by-one the engine exists to get right).
const boundary = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(1),
  today: TODAY,
  scope: ["ftse"],
  storage: store,
});
assert.equal(boundary.rows[0]?.state, "missing", "daysOut === leadDays is missing, not not-yet-due");
assert.equal(boundary.totals.missing, 1);
ok("boundary: daysOut === leadDays → missing (silence has no excuse left)")

// Per-event override: user-set 9-day override → 10 days out is missing?? No —
// 9-day lead, 10 days out = not-yet-due. Override wins over FTSE's stated 5.
setEventOverride("ftse", "cash-dividend", 9, store);
const overridden = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(10),
  today: TODAY,
  scope: ["ftse"],
  storage: store,
});
assert.equal(overridden.rows[0]?.state, "not-yet-due");
assert.equal(
  leadTimeProvenance(overridden.rows[0]?.source ?? "unset", "ftse").label,
  "your setting",
);
ok("per-event override (9d) wins over stated 5d — still provenance 'your setting'")

// Stated provenance copy for the settings-seeded vendor.
const statedRow = due.rows[0];
assert.deepEqual(leadTimeProvenance(statedRow?.source ?? "unset", "ftse"), {
  label: "from FTSE 5-day proforma tracker",
  tone: "stated",
});
ok("stated lead time: provenance names the documented source (D3)")

// Not-assessed provenance reads 'not set' (D3).
assert.deepEqual(
  leadTimeProvenance(unaGraded.rows[0]?.source ?? "unset", "msci"),
  { label: "not set", tone: "unset" },
);
ok("unset lead time: provenance reads 'not set' — no number, no source, no verdict")

// ─── Present-at-vendor injection (feed detection arrives later) ────────────
const covered = computeLookupVerdict({
  ticker: "ABC",
  eventType: "cash-dividend",
  exDate: ex(2),
  today: TODAY,
  scope: ["ftse"],
  storage: store,
  isPresentAtVendor: () => true,
});
assert.equal(covered.rows[0]?.state, "covered");
assert.equal(covered.totals.covered, 1);
assert.equal(covered.totals.missing, 0);
ok("feed-present injection grades 'covered' — the counting already supports it")

// Verdict summary composes real numbers (non-empty).
const summary = verdictSummary(mixed.totals, mixed.empty);
assert.ok(summary.includes("1 of 2 in-scope vendors assessed"));
assert.ok(summary.includes("1 missing"));
ok(`verdict summary composes totals: "${summary}"`)

console.log(`\nOK — ${n} lookup-verdict assertions pass (§7a-ii)`);