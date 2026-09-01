#!/usr/bin/env node
/**
 * Self-check for `src/data/rules.json` — the vendor treatment rules (§5b, §7a-i).
 *
 * Plain node, no deps, no test runner. Node ≥22.18 strips types natively, so
 * importing `CANONICAL_EVENTS` from the real source keeps the coverage check
 * from drifting from the app's 13 event types.
 *
 * Required keys and enum values are derived from `rules.schema.json` itself,
 * so the checks can never drift from the schema.
 *
 * Run from repo root: node scripts/check-rules.mjs
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import { CANONICAL_EVENTS } from "../src/lib/event-taxonomy.ts"

const schema = JSON.parse(
  fs.readFileSync("src/data/rules.schema.json", "utf8"),
)
const ruleSchema = schema.properties.rules.items
const ruleProps = ruleSchema.properties
const REQUIRED_KEYS = ruleSchema.required
const LEAD_CONFIDENCES = ruleProps.lead_days_confidence.enum
const CONFIDENCES = ruleProps.confidence.enum

const raw = JSON.parse(fs.readFileSync("src/data/rules.json", "utf8"))
const rules = raw.rules
assert.ok(Array.isArray(rules), "rules.json must contain a `rules` array")

const canonicalIds = CANONICAL_EVENTS.map((e) => e.id)

let violations = 0
const fail = (msg) => {
  console.error(`  ✗ ${msg}`)
  violations++
}

for (const rule of rules) {
  for (const key of REQUIRED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rule, key)) {
      fail(`rule ${rule.event_type ?? "(no event_type)"} missing required key \`${key}\``)
    }
  }
  if (!Object.prototype.hasOwnProperty.call(rule, "event_type")) continue

  // D2: this file is deliberately MSCI-only until the schema survives contact with real text.
  assertRule(rule.vendor === "msci", `${rule.event_type}: vendor must be \`msci\``)
  assertRule(typeof rule.source_ref === "string" && rule.source_ref.trim().length > 0, `${rule.event_type}: source_ref must be non-empty`)
  assertRule(rule.lead_days === null || Number.isInteger(rule.lead_days), `${rule.event_type}: lead_days must be an integer or null`)
  assertRule(typeof rule.treatment === "string" && rule.treatment.trim().length > 0, `${rule.event_type}: treatment must be non-empty`)
  assertRule(LEAD_CONFIDENCES.includes(rule.lead_days_confidence), `${rule.event_type}: lead_days_confidence must be one of ${LEAD_CONFIDENCES.join("|")}`)
  assertRule(CONFIDENCES.includes(rule.confidence), `${rule.event_type}: confidence must be one of ${CONFIDENCES.join("|")}`)
  // A null lead_days can never be labelled `stated` — an unstated lead time is not stated.
  if (rule.lead_days === null && rule.lead_days_confidence === "stated") {
    fail(`${rule.event_type}: lead_days is null but marked \`stated\``)
  }
  // An integer lead_days must be justified — inferred or stated, never absent.
  if (rule.lead_days !== null && rule.lead_days_confidence === "absent") {
    fail(`${rule.event_type}: lead_days is an integer but lead_days_confidence is \`absent\``)
  }
}

// D3 (2026-09-02): an ORDINARY cash dividend is NEVER price-adjusted / PAF'd —
// the Price Return index passes it through untouched; only TR/NTR variants
// reinvest it. A PAF is a special-dividend mechanism. This specific error must
// not come back silently.
const ordinaryDividendRules = rules.filter((r) => r.event_type === "cash-dividend")
for (const rule of ordinaryDividendRules) {
  const t = (rule.treatment ?? "").toLowerCase()
  const deniesAdjustment =
    /no\s+price\s+adjustment|not\s+(price\s+|pr\s+)?adjust(ed|ment)?|paf\s*=\s*none/.test(t)
  const assignsPaf = /paf\s*=\s*(?!none\b)\S+/.test(t)
  assertRule(
    deniesAdjustment && !assignsPaf,
    `${rule.vendor}/${rule.event_type}: ordinary cash dividends must deny any price adjustment / PAF (SPECS/research/ca-event-treatments-2026-09-02.md §1)`,
  )
}

const ordinaryChecked = ordinaryDividendRules.length

const populated = canonicalIds.filter((id) => rules.some((r) => r.event_type === id))
const withTreatment = rules.filter((r) => typeof r.treatment === "string" && r.treatment.trim().length > 0).length
const withLead = rules.filter((r) => r.lead_days !== null).length
const withoutLead = rules.filter((r) => r.lead_days === null).length

// D2: all 13 app-documented event types must be populated for MSCI.
if (populated.length !== canonicalIds.length) {
  fail(`coverage: ${populated.length}/${canonicalIds.length} event types populated; missing: ${canonicalIds.filter((id) => !populated.includes(id)).join(", ")}`)
}

if (violations > 0) {
  console.error(`\nFAIL — ${violations} violation(s) in src/data/rules.json`)
  process.exit(1)
}

console.log(
  `OK — rules.json valid: ${rules.length} MSCI rules across ${populated.length}/${canonicalIds.length} event types; ` +
  `${withTreatment} with treatment; ${withLead} stated lead_days, ${withoutLead} null (lead time not documented); ` +
  `ordinary-dividend no-PAF assertion: PASS (${ordinaryChecked} cash-dividend row(s) checked)`,
)

function assertRule(cond, msg) {
  if (!cond) fail(msg)
}