#!/usr/bin/env node
/**
 * The References block at the foot of a lookup is DERIVED, and the first version
 * of that derivation was wrong: it walked every row, while TreatmentSummary
 * renders a citation only for rows that HAVE a rule. A ruleless row therefore
 * put an entry at the foot that nothing on the page linked to.
 *
 * This drives the REAL verdict engine into the REAL collector the component
 * uses, so a regression in either is caught. An earlier attempt at this check
 * reimplemented the rule instead of importing it, which made it tautological -
 * it would have passed against the broken component.
 */
import assert from "node:assert/strict";
import { computeLookupVerdict } from "../src/lib/lookup-verdict.ts";
import { collectCitedSources } from "../src/lib/ca-analyst/citations.ts";
import { VENDOR_IDS } from "../src/lib/vendors.ts";

const EX_DATE = "2026-09-29";
const TODAY = new Date("2026-09-17T00:00:00Z");
const EVENT_TYPES = ["cash-dividend", "special-dividend", "rights-issue", "stock-split", "merger"];

const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
  };
};

const verdictFor = (eventType, scope) =>
  computeLookupVerdict({
    ticker: "AAPL", eventType,
    exDate: new Date(`${EX_DATE}T00:00:00Z`), today: TODAY,
    scope, storage: memoryStorage(),
  });

let checked = 0;
for (const eventType of EVENT_TYPES) {
  const verdict = verdictFor(eventType, [...VENDOR_IDS]);
  const cited = collectCitedSources(verdict.rows);

  // 1. No duplicates: a source cited by three vendors is written once.
  assert.equal(new Set(cited).size, cited.length,
    `${eventType}: the reference list contains a duplicate`);

  // 2. Every reference is reachable from a row that actually renders one.
  //    This is the orphan bug: a ruleless row must not contribute.
  const renderable = new Set();
  for (const row of verdict.rows) {
    if (!row.rulePresent) continue;
    for (const t of row.treatments) if (t.sourceRef) renderable.add(t.sourceRef);
    if (row.sourceRef) renderable.add(row.sourceRef);
  }
  for (const source of cited) {
    assert.ok(renderable.has(source),
      `${eventType}: "${String(source).slice(0, 60)}" is listed at the foot but no row renders a link to it`);
  }

  // 3. Nothing a row renders is missing from the list, or its marker resolves nowhere.
  for (const source of renderable) {
    assert.ok(cited.includes(source),
      `${eventType}: a row cites "${String(source).slice(0, 60)}" but it has no entry at the foot`);
  }

  // 4. A ruleless row contributes nothing of its own.
  for (const row of verdict.rows.filter((r) => !r.rulePresent)) {
    if (row.sourceRef && !renderable.has(row.sourceRef)) {
      assert.ok(!cited.includes(row.sourceRef),
        `${eventType}/${row.vendor}: a row with no rule contributed a reference`);
    }
  }
  checked += 1;
}

// Numbering is positional, so order must be stable across calls or the "Source N"
// markers and the footnotes drift apart between renders.
const a = collectCitedSources(verdictFor("special-dividend", [...VENDOR_IDS]).rows);
const b = collectCitedSources(verdictFor("special-dividend", [...VENDOR_IDS]).rows);
assert.deepEqual(a, b, "collectCitedSources must be stable: the numbers are positional");

console.log(`check-citations: ok (${checked} event types, ${a.length} sources in the worked case)`);
