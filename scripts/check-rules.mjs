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
import { VENDOR_IDS } from "../src/lib/vendors.ts"

const schema = JSON.parse(
  fs.readFileSync("src/data/rules.schema.json", "utf8"),
)
const ruleSchema = schema.properties.rules.items
const ruleProps = ruleSchema.properties
const REQUIRED_KEYS = ruleSchema.required
const LEAD_CONFIDENCES = ruleProps.lead_days_confidence.enum
const CONFIDENCES = ruleProps.confidence.enum
// Rules currently published in rules.json; add the vendor here as each verified
// 13-event block lands, while VENDOR_IDS remains the broader app-level registry.
const RULE_VENDOR_ALLOWLIST = ["msci", "sp", "ftse", "stoxx", "morningstar", "solactive"]

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

  // D2: vendor must be a known app vendor id (src/lib/vendors.ts VENDOR_IDS).
  assertRule(
    VENDOR_IDS.includes(rule.vendor),
    `${rule.event_type}: vendor \`${rule.vendor}\` not in VENDOR_IDS`,
  )
  assertRule(
    RULE_VENDOR_ALLOWLIST.includes(rule.vendor),
    `${rule.event_type}: vendor \`${rule.vendor}\` not in the rules allowlist`,
  )
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
  // A `practitioner` lead time is Alex's domain knowledge, distinguishable from
  // a vendor's published figure — the source_ref MUST say so.
  if (rule.lead_days_confidence === "practitioner" && !rule.source_ref?.startsWith("practitioner:")) {
    fail(`${rule.event_type}: lead_days_confidence is \`practitioner\` but source_ref does not start with \`practitioner:\``)
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

// D3 (2026-09-02): per-vendor coverage — each vendor present must populate all 13
// canonical event types. A vendor with no rows yet is a future task, not reported here.
const vendorsPresent = [...new Set(rules.map((r) => r.vendor))]
const perVendor = vendorsPresent.map((vendor) => {
  const vendorRules = rules.filter((r) => r.vendor === vendor)
  const populated = canonicalIds.filter((id) => vendorRules.some((r) => r.event_type === id))
  const withLead = vendorRules.filter((r) => r.lead_days !== null).length
  const withoutLead = vendorRules.filter((r) => r.lead_days === null).length
  if (populated.length !== canonicalIds.length) {
    fail(
      `coverage ${vendor}: ${populated.length}/${canonicalIds.length} event types populated; missing: ${canonicalIds.filter((id) => !populated.includes(id)).join(", ")}`,
    )
  }
  return `${vendor} ${populated.length}/${canonicalIds.length} (${withLead} stated lead, ${withoutLead} null)`
})

const withTreatment = rules.filter((r) => typeof r.treatment === "string" && r.treatment.trim().length > 0).length

if (violations > 0) {
  console.error(`\nFAIL — ${violations} violation(s) in src/data/rules.json`)
  process.exit(1)
}

console.log(
  `OK — rules.json valid: ${rules.length} rules across ${vendorsPresent.length} vendor(s). ` +
  perVendor.join(" | ") + ". " +
  `${withTreatment} with treatment; ` +
  `ordinary-dividend no-PAF assertion: PASS (${ordinaryChecked} cash-dividend row(s) checked)`,
)

function assertRule(cond, msg) {
  if (!cond) fail(msg)
}