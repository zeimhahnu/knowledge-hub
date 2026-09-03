#!/usr/bin/env node
import assert from "node:assert/strict"
import {
  freshSettingsDraft,
  isSettingsDraftDirty,
  reduceSettingsSave,
} from "../src/lib/coverage-settings.ts"

const stored = freshSettingsDraft()
const changed = { ...stored, vendorDefaults: { ftse: 3 } }

assert.equal(isSettingsDraftDirty(stored, stored), false, "a fresh draft is clean")
assert.equal(isSettingsDraftDirty(changed, stored), true, "a changed field is dirty")

const saving = { stored, draft: changed, status: "idle" }
const saved = reduceSettingsSave(saving, { type: "save-success" })
assert.equal(isSettingsDraftDirty(saved.draft, saved.stored), false, "saving makes the draft clean")
assert.equal(saved.status, "saved")

const discarded = reduceSettingsSave(saving, { type: "discard" })
assert.deepEqual(discarded.draft, stored, "discard restores the stored values")
assert.equal(discarded.status, "idle")

const failed = reduceSettingsSave(saving, { type: "save-failure" })
assert.deepEqual(failed.draft, changed, "a failed write leaves the draft intact")
assert.deepEqual(failed.stored, stored, "a failed write does not change stored values")
assert.equal(failed.status, "failed", "a failed write reports failure")

console.log("OK — settings save draft assertions pass")
