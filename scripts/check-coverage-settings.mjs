#!/usr/bin/env node
/**
 * Self-check for `src/lib/coverage-settings.ts` — the §11c lead-time store.
 *
 * Plain node, no deps, no browser. Node ≥22.18 strips types natively, so
 * this imports the REAL module — the check can never drift from the source.
 * A fake Storage object is injected; no window.localStorage is touched.
 *
 * Assertions (D4 contract):
 *   1. Resolution order: user per-event-type override > user per-vendor
 *      default > seeded/stated > unset.
 *   2. Cross-contamination: on the SAME virgin store, FTSE seeds 5/'stated'
 *      while MSCI seeds null/'unset' — one vendor's seed never leaks into
 *      another's verdict.
 *   3. A throwing storage falls back to the seeded value, never crashes.
 *   4. An unset value returns { value: null, source: 'unset' }.
 *
 * Run from repo root: node scripts/check-coverage-settings.mjs
 */
import assert from "node:assert/strict"
import {
  STORAGE_KEY,
  getEventOverrides,
  getLeadDays,
  getVendorLeadDays,
  hasUserSettings,
  resetVendor,
  setEventOverride,
  setVendorDefault,
} from "../src/lib/coverage-settings.ts"

let n = 0
const ok = (name) => {
  n++
  console.log(`  ✓ ${name}`)
}

/** In-memory Storage stand-in: same surface as the browser object. */
const makeFakeStorage = () => {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    _map: map,
  }
}

const THROWING_STORAGE = {
  getItem() {
    throw new Error("storage denied (private window)")
  },
  setItem() {
    throw new Error("storage denied")
  },
  removeItem() {
    throw new Error("storage denied")
  },
}

assert.equal(STORAGE_KEY, "ca-hub.lead-days.v1", "single namespaced storage key")
ok(`STORAGE_KEY namespaced: ${STORAGE_KEY}`)

// ─── Virgin store: FTSE seeded, MSCI not (cross-contamination) ─────────────
const virgin = makeFakeStorage()

assert.deepEqual(getVendorLeadDays("ftse", virgin), { value: 5, source: "stated" })
assert.deepEqual(getLeadDays("ftse", "cash-dividend", virgin), { value: 5, source: "stated" })
ok("virgin store: FTSE seeds 5 with source 'stated' (FTSE 5-day proforma tracker)")

assert.deepEqual(getVendorLeadDays("msci", virgin), { value: null, source: "unset" })
assert.deepEqual(getLeadDays("msci", "cash-dividend", virgin), { value: null, source: "unset" })
ok("virgin store: MSCI seeds null with source 'unset' — FTSE's 5 never leaks across vendors")

assert.deepEqual(getVendorLeadDays("solactive", virgin), { value: null, source: "unset" })
ok("virgin store: undocumented vendor (Solactive) is 'unset', not inheriting FTSE's 5")

// ─── Resolution order: override > vendor default > stated > unset ──────────
const store = makeFakeStorage()

setVendorDefault("ftse", 3, store)
assert.deepEqual(getLeadDays("ftse", "cash-dividend", store), { value: 3, source: "user-set" })
ok("user vendor default (3) beats FTSE's stated 5")

assert.deepEqual(getLeadDays("ftse", "merger", store), { value: 3, source: "user-set" })
ok("vendor default applies to event types without their own override (merger -> 3)")

setEventOverride("ftse", "cash-dividend", 1, store)
assert.deepEqual(getLeadDays("ftse", "cash-dividend", store), { value: 1, source: "user-set" })
ok("per-event-type override (1) beats the per-vendor default (3)")

// Overrides are opt-in: an event the user never touched falls back cleanly.
resetVendor("ftse", store)
assert.deepEqual(getLeadDays("ftse", "cash-dividend", store), { value: 5, source: "stated" })
assert.deepEqual(getEventOverrides("ftse", store), [])
ok("resetVendor clears default AND overrides, back to stated 5")

// Override on a vendor with no stated number at all.
setEventOverride("msci", "merger", 4, store)
assert.deepEqual(getLeadDays("msci", "merger", store), { value: 4, source: "user-set" })
assert.deepEqual(getLeadDays("msci", "cash-dividend", store), { value: null, source: "unset" })
assert.deepEqual(getEventOverrides("msci", store), [{ eventType: "merger", days: 4 }])
ok("override for one MSCI event stays scoped: others on the same vendor remain 'unset'")

// Clear an override back to unset.
setEventOverride("msci", "merger", null, store)
assert.deepEqual(getLeadDays("msci", "merger", store), { value: null, source: "unset" })
ok("clearing an override returns the vendor to 'unset'")

assert.equal(hasUserSettings("ftse", virgin), false)
assert.equal(hasUserSettings("msci", store), false)
setVendorDefault("ftse", 5, store)
assert.equal(hasUserSettings("ftse", store), true)
resetVendor("ftse", store)
assert.equal(hasUserSettings("ftse", store), false)
ok("hasUserSettings reflects whether the operator touched the vendor")

// ─── Throwing storage: fall back to seed, never crash ──────────────────────
assert.deepEqual(getLeadDays("ftse", "cash-dividend", THROWING_STORAGE), {
  value: 5,
  source: "stated",
})
assert.deepEqual(getVendorLeadDays("msci", THROWING_STORAGE), { value: null, source: "unset" })
setVendorDefault("ftse", 2, THROWING_STORAGE) // must not throw
ok("throwing storage falls back to seeded/stated values and never crashes")

// ─── Unset contract ─────────────────────────────────────────────────────────
assert.deepEqual(getLeadDays("sp", "cash-dividend", virgin), { value: null, source: "unset" })
assert.deepEqual(getVendorLeadDays("vettafi", virgin), { value: null, source: "unset" })
ok("unset returns { value: null, source: 'unset' } — consumer disables the verdict")

console.log(`\nOK — ${n} coverage-settings assertions pass (§11c)`)