#!/usr/bin/env node
import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };

const rows = rules.rules;
const find = (vendor, eventType, indexType = "*") => rows.find((row) => row.vendor === vendor && row.event_type === eventType && row.index_type === indexType);
const sourcePage = (row) => /\bp{1,2}\.\s*\d+/i.test(row?.source_ref ?? "");

function analystAnswer(vendor, eventType, indexType) {
  const row = find(vendor, eventType, indexType);
  if (!row || row.confidence === "absent" || row.treatment === null) {
    return `${vendor} has no stated treatment for ${eventType}; the result is indeterminate. Source: ${row?.source_ref ?? "none"}. Confidence: absent.`;
  }
  return `Treatment: ${row.treatment} Confidence: ${row.confidence}. Source: ${row.source_ref}`;
}

const solactiveCash = rows.filter((row) => row.vendor === "solactive" && row.event_type === "cash-dividend");
assert.deepEqual(new Set(solactiveCash.map((row) => row.index_type)), new Set(["price-return", "gross-total-return", "net-total-return"]), "Solactive cash dividends must expose PR/GTR/NTR branches");
for (const row of solactiveCash) {
  assert.equal(row.confidence, "stated");
  assert.equal(row.lead_days, null, "implementation notice is not a publication lead time");
  assert.ok(sourcePage(row));
}
const solactiveAnswer = analystAnswer("solactive", "cash-dividend", "gross-total-return");
assert.match(solactiveAnswer, /Treatment:/);
assert.match(solactiveAnswer, /Confidence: stated/);
assert.match(solactiveAnswer, /solactive-equity-index-methodology-v1\.20-2026-06-16\.pdf/);
assert.match(solactiveAnswer, /p\.13/);

const vettafiSpecial = rows.filter((row) => row.vendor === "vettafi" && row.event_type === "special-dividend");
assert.deepEqual(new Set(vettafiSpecial.map((row) => row.index_type)), new Set(["market-cap-weighted", "non-market-cap-weighted"]), "VettaFi special dividends must expose both weighting branches");
assert.match(analystAnswer("vettafi", "special-dividend", "market-cap-weighted"), /redistributed proportionally/);
assert.match(analystAnswer("vettafi", "special-dividend", "non-market-cap-weighted"), /reinvested into the payer/);
for (const row of vettafiSpecial) {
  assert.equal(row.confidence, "stated");
  assert.match(row.source_ref, /vettafi-index-maintenance-policy-v1\.1\.8-2026-05\.pdf/);
  assert.ok(sourcePage(row));
}

const merger = find("vettafi", "merger");
assert.ok(merger);
assert.match(merger.treatment, /index-specific, not universal/);
assert.match(merger.treatment, /product methodology is required/);
assert.match(analystAnswer("vettafi", "merger"), /Confidence: stated/);

const absent = find("vettafi", "return-of-capital");
assert.equal(absent.treatment, null);
assert.equal(absent.confidence, "absent");
assert.match(analystAnswer("vettafi", "return-of-capital"), /indeterminate/);

const inferred = find("solactive", "bonus-issue");
assert.equal(inferred.confidence, "inferred");
assert.ok(inferred.mapping_note);
assert.match(analystAnswer("solactive", "bonus-issue"), /Confidence: inferred/);

// Deliberately broken old baseline: the former GPR-only source must not pass
// the current framework source contract.
assert.throws(() => {
  const stale = { ...find("solactive", "cash-dividend"), source_ref: "SOURCES/solactive-gpr-global-100-2026.pdf §4.1 (p. 9)" };
  assert.match(stale.source_ref, /solactive-equity-index-methodology-v1\.20-2026-06-16\.pdf/);
});

console.log("OK — CA Analyst Solactive/VettaFi treatment, confidence, citations, branches, silence, and stale-baseline refusal pass");
