#!/usr/bin/env node
/** Regression proof for screen -> proposal -> human approval, without touching disk. */
import assert from "node:assert/strict";
import rules from "../src/data/rules.json" with { type: "json" };
import { judge } from "../src/lib/screen-methodology.ts";
import { buildProposedRules } from "../src/lib/ingest.ts";
import { asRulesDocument, validateRulesDocument } from "../src/lib/rule-validation.ts";

const screenedFixture = Array.from({ length: 80 }, () =>
  "VettaFi methodology corporate action index dividend constituent ex-date adjustment factor review free float market capitalization stock split rights issue merger.",
).join(" ");
const verdict = judge(screenedFixture, "vettafi");
assert.equal(verdict.accepted, true, `screened fixture must be accepted: ${verdict.reasons.join("; ")}`);
const proposals = buildProposedRules("vettafi", screenedFixture, "src/data/methodologies/2026-09-08/vettafi-fixture.json");
assert.equal(proposals.length, 13, "one candidate must be proposed per canonical event type");
assert.ok(proposals.some((proposal) => proposal.treatment !== null), "screened fixture should produce a treatment candidate");

const absentText = Array.from({ length: 80 }, () =>
  "Solactive methodology describes corporate action index review, dividend data, constituent files, ex-date processing, adjustment factors, free float and market capitalization.",
).join(" ");
const absent = buildProposedRules("solactive", absentText, "src/data/methodologies/2026-09-08/solactive-fixture.json");
assert.equal(absent.length, 13);
assert.ok(absent.every((proposal) => proposal.confidence === "absent" && proposal.treatment === null), "silence must remain absent, not a fabricated treatment");

const approvedCandidate = proposals.find((proposal) => proposal.treatment !== null);
assert.ok(approvedCandidate);
const approved = asRulesDocument({ ...rules, rules: [...rules.rules, approvedCandidate] });
assert.deepEqual(validateRulesDocument(approved), [], "approving a candidate must yield a schema-valid rules document");
assert.equal(rules.rules.some((rule) => rule.vendor === "vettafi"), false, "the fixture check must not mutate curated rules");

console.log("OK — screened fixture proposes candidates, absent methodology stays absent, and approval validates");
